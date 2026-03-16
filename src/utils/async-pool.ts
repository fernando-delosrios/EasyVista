export const runWithConcurrency = async <T>(
    items: T[],
    concurrency: number,
    worker: (item: T, index: number) => Promise<void>
): Promise<void> => {
    if (items.length === 0) {
        return
    }

    const safeConcurrency = Math.max(1, Math.min(concurrency, items.length))
    let nextIndex = 0

    const workers = Array.from({ length: safeConcurrency }, async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex++
            await worker(items[currentIndex], currentIndex)
        }
    })

    await Promise.all(workers)
}
