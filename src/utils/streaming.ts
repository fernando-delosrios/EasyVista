import { Response } from '@sailpoint/connector-sdk'

export const withKeepAlive = async <T>(
    res: Response<T>,
    processingWaitMs: number,
    work: () => Promise<void>
): Promise<void> => {
    const interval = setInterval(() => {
        res.keepAlive()
    }, processingWaitMs)

    try {
        await work()
    } finally {
        clearInterval(interval)
    }
}
