/**
 * pdfjs-dist 4 calls Promise.withResolvers (Node 22+).
 * Keep tests working on Node 20 CI runners as well.
 */
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
