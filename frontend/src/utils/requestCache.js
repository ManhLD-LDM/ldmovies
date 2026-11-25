// GET cache shared by the movie API clients:
// - successful responses are kept for `ttl` ms
// - concurrent identical requests share one in-flight promise
// - at most `maxEntries` keys (oldest inserted evicted first)
// - failed requests are not cached, so a retry hits the network again
export function createCachedGet(client, { ttl = 5 * 60 * 1000, maxEntries = 300 } = {}) {
  const cache = new Map();

  const evictOverflow = () => {
    while (cache.size > maxEntries) {
      cache.delete(cache.keys().next().value);
    }
  };

  return (url, config = {}) => {
    const key = url + JSON.stringify(config.params || {});
    const entry = cache.get(key);
    if (entry && (entry.pending || Date.now() - entry.timestamp < ttl)) {
      return entry.promise;
    }

    const promise = client.get(url, config).then(
      (response) => {
        cache.set(key, { promise, timestamp: Date.now(), pending: false });
        return response;
      },
      (error) => {
        cache.delete(key);
        throw error;
      }
    );

    cache.delete(key); // re-insert so insertion order reflects recency
    cache.set(key, { promise, timestamp: Date.now(), pending: true });
    evictOverflow();
    return promise;
  };
}
