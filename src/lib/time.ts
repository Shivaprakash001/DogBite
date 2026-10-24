/** Milliseconds elapsed since a timestamp. Kept out of components so render stays pure. */
export const msSince = (start: number): number => Date.now() - start;
