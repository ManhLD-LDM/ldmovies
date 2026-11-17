import Hls from 'hls.js';

// Mẫu segment quảng cáo SSAI phổ biến từ nguồn PhimAPI/KKPhim (ví dụ: /v9/<md5>/segment_0001.ts)
const KNOWN_AD_SEGMENT_REGEX =
  /^(?:https?:\/\/[^/]+)?\/v\d+\/[a-f0-9]{16,}\/segment_\d+\.(?:ts|m4s|mp4|aac)(?:\?.*)?$/i;

const AD_PATH_REGEX =
  /^(?:https?:\/\/[^/]+)?\/(?:ad|ads|adjump|quangcao|promo)\//i;

const CONVERT_SEGMENT_REGEX = /^convertv\d+\//i;

const SEQUENTIAL_SEGMENT_REGEX = /(?:^|\/)(?:segment|seg|ad)[_-]?\d+\.(?:ts|m4s|mp4|aac)(?:\?.*)?$/i;

const BODY_START_PREFIXES = [
  '#EXT-X-DISCONTINUITY',
  '#EXTINF:',
  '#EXT-X-KEY:',
  '#EXT-X-BYTERANGE:',
  '#EXT-X-PROGRAM-DATE-TIME:',
];

function isBodyLine(trimmedLine) {
  if (!trimmedLine) return false;
  if (!trimmedLine.startsWith('#')) return true;
  return BODY_START_PREFIXES.some((prefix) => trimmedLine.startsWith(prefix));
}

function isAdSegmentUri(uri) {
  return KNOWN_AD_SEGMENT_REGEX.test(uri) || AD_PATH_REGEX.test(uri);
}

/**
 * Nhận diện khối video quảng cáo chen ngang (SSAI).
 * Chỉ khớp các đoạn quảng cáo rời (được ghép tách biệt),
 * tuyệt đối không đánh nhầm các segment `convertv7/` hoặc `convertv9/` của phim thật.
 */
function isAdBlock(block, totalSegments) {
  const { segments, lines, duration, hasConvertSeg } = block;
  if (segments.length === 0 || hasConvertSeg) return false;

  // Khớp trực tiếp mẫu /v<n>/<hash>/segment_NNNN.ts hoặc /ad(s)/...
  if (segments.every((seg) => isAdSegmentUri(seg))) {
    return true;
  }

  // Fallback cấu trúc tổng quát phòng trường hợp CDN đổi tên thư mục /v10/ hay tên segment:
  // - Không phải toàn bộ video (< 50% tổng số segment và <= 40 segment)
  // - Có kèm #EXT-X-KEY:METHOD=NONE
  // - Tất cả segment đều là absolute-path (/...) hoặc full URL với đặt tên dạng segment_0001.ts
  const isSmallSubBlock =
    totalSegments > 0 &&
    segments.length < totalSegments * 0.5 &&
    segments.length <= 40 &&
    duration > 0 &&
    duration <= 120;

  if (!isSmallSubBlock) return false;

  const hasResetKey = lines.some((l) => l.startsWith('#EXT-X-KEY:METHOD=NONE'));
  const allExternalOrRootPaths = segments.every(
    (seg) => (seg.startsWith('/') || /^https?:\/\//i.test(seg)) && SEQUENTIAL_SEGMENT_REGEX.test(seg)
  );

  return hasResetKey && allExternalOrRootPaths;
}

/**
 * Loại bỏ các khối video quảng cáo SSAI chen ngang khỏi media playlist `.m3u8`.
 * Giữ nguyên master playlist và giữ nguyên các segment phim thật (`convertv9/`, `convertv7/`).
 *
 * @param {string} playlistText - Nội dung `.m3u8` gốc
 * @returns {{ cleanedPlaylist: string, removedAdSegments: number, removedDuration: number }}
 */
export function stripMidrollAdsFromM3u8(playlistText) {
  if (!playlistText || typeof playlistText !== 'string' || !playlistText.includes('#EXTINF:')) {
    return { cleanedPlaylist: playlistText, removedAdSegments: 0, removedDuration: 0 };
  }

  const rawLines = playlistText.split(/\r?\n/);
  const headerLines = [];
  const footerLines = [];
  const bodyLines = [];

  let inBody = false;
  let inFooter = false;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (inFooter) {
      footerLines.push(line);
      continue;
    }

    if (line === '#EXT-X-ENDLIST') {
      inFooter = true;
      footerLines.push(line);
      continue;
    }

    if (!inBody) {
      if (isBodyLine(line)) {
        inBody = true;
        bodyLines.push(line);
      } else {
        headerLines.push(line);
      }
    } else {
      bodyLines.push(line);
    }
  }

  // Tách body thành các khối dựa trên #EXT-X-DISCONTINUITY
  const blocks = [];
  let curBlock = {
    lines: [],
    segments: [],
    duration: 0,
    hasConvertSeg: false,
    leadingDiscontinuities: 0,
  };
  let pendingDiscontinuities = 0;

  for (const line of bodyLines) {
    if (line === '#EXT-X-DISCONTINUITY') {
      if (curBlock.lines.length > 0) {
        blocks.push(curBlock);
        curBlock = {
          lines: [],
          segments: [],
          duration: 0,
          hasConvertSeg: false,
          leadingDiscontinuities: 0,
        };
      }
      pendingDiscontinuities += 1;
      continue;
    }

    if (curBlock.lines.length === 0) {
      curBlock.leadingDiscontinuities = pendingDiscontinuities;
      pendingDiscontinuities = 0;
    }

    curBlock.lines.push(line);

    if (line.startsWith('#EXTINF:')) {
      const dur = parseFloat(line.slice(8).split(',')[0]);
      if (Number.isFinite(dur)) {
        curBlock.duration += dur;
      }
    } else if (!line.startsWith('#')) {
      curBlock.segments.push(line);
      if (CONVERT_SEGMENT_REGEX.test(line)) {
        curBlock.hasConvertSeg = true;
      }
    }
  }

  if (curBlock.lines.length > 0) {
    blocks.push(curBlock);
  }
  const trailingDiscontinuities = pendingDiscontinuities;

  const totalSegments = blocks.reduce((sum, blk) => sum + blk.segments.length, 0);
  const annotatedBlocks = blocks.map((blk) => ({
    ...blk,
    isAd: isAdBlock(blk, totalSegments),
  }));

  if (!annotatedBlocks.some((blk) => blk.isAd)) {
    return { cleanedPlaylist: playlistText, removedAdSegments: 0, removedDuration: 0 };
  }

  const outputLines = [...headerLines];
  let prevKeptBlock = null;
  let skippedAdSincePrevKept = false;
  let removedAdSegments = 0;
  let removedDuration = 0;

  for (const blk of annotatedBlocks) {
    if (blk.isAd) {
      removedAdSegments += blk.segments.length;
      removedDuration += blk.duration;
      skippedAdSincePrevKept = true;
      continue;
    }

    if (prevKeptBlock !== null) {
      if (!skippedAdSincePrevKept) {
        for (let i = 0; i < blk.leadingDiscontinuities; i += 1) {
          outputLines.push('#EXT-X-DISCONTINUITY');
        }
      } else if (prevKeptBlock.hasConvertSeg || blk.hasConvertSeg) {
        // Giữ lại 1 discontinuity nếu kề bên segment đã re-encode để reset PTS an toàn
        outputLines.push('#EXT-X-DISCONTINUITY');
      }
    }

    outputLines.push(...blk.lines);
    prevKeptBlock = blk;
    skippedAdSincePrevKept = false;
  }

  if (!skippedAdSincePrevKept && trailingDiscontinuities > 0 && prevKeptBlock !== null) {
    for (let i = 0; i < trailingDiscontinuities; i += 1) {
      outputLines.push('#EXT-X-DISCONTINUITY');
    }
  }

  outputLines.push(...footerLines);

  return {
    cleanedPlaylist: outputLines.join('\n'),
    removedAdSegments,
    removedDuration,
  };
}

/**
 * Tạo custom Playlist Loader (`pLoader`) cho `hls.js` để tự động lọc quảng cáo
 * ngay khi tải `.m3u8` mà không cần proxy qua backend.
 */
export function createAdFreePlaylistLoader() {
  const BaseLoader = Hls.DefaultConfig.loader;

  return class AdFreePlaylistLoader extends BaseLoader {
    load(context, config, callbacks) {
      const wrappedCallbacks = {
        ...callbacks,
        onSuccess: (response, stats, ctx, networkDetails) => {
          if (
            response &&
            typeof response.data === 'string' &&
            response.data.includes('#EXTINF:')
          ) {
            const { cleanedPlaylist } = stripMidrollAdsFromM3u8(response.data);
            if (cleanedPlaylist !== response.data) {
              response = { ...response, data: cleanedPlaylist };
            }
          }
          callbacks.onSuccess(response, stats, ctx, networkDetails);
        },
      };

      super.load(context, config, wrappedCallbacks);
    }
  };
}
