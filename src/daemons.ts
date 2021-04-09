import logger from './utilities/logger';
import { getHeapStatistics } from 'v8';
import configurations from './configurations';
const {
    debugThreshold,
    warningThreshold,
    errorThreshold,
    interval: memoryDaemonInterval
} = configurations.monitoring.memory;
const minThreshold = Math.min(debugThreshold, warningThreshold, errorThreshold);

interface GetMemoryStatisticsBaseResult {
    usedMemoryPercent: number;
}
interface GetMemoryStatisticsFullResult {
    heapTotalMegaBytes: number;
    heapAvailableMegaBytes: number;
    heapUsedMegaBytes: number;
}
type GetMemoryStatisticsResult = GetMemoryStatisticsBaseResult | (GetMemoryStatisticsBaseResult & GetMemoryStatisticsFullResult);
export const getMemoryStatistics = (): GetMemoryStatisticsResult => {
    // const { heapTotal, heapUsed } = process.memoryUsage();
    // const heapAvailable =  heapTotal - heapUsed;
    // logger.debug(`Memory Usage: ${(100 * heapAvailable / heapTotal).toFixed(1)} ${JSON.stringify ({heapTotal, heapUsed, heapAvailable})}`);
    const {
        heap_size_limit: heapTotalBytes,
        total_available_size: heapAvailableBytes,
        used_heap_size: heapUsedBytes,
    } = getHeapStatistics();
    const usedMemoryPercent = 100 * heapUsedBytes / heapTotalBytes;
    let result: GetMemoryStatisticsResult = {
        usedMemoryPercent
    };
    if (usedMemoryPercent > minThreshold) {
        const heapTotalMegaBytes = Math.floor(heapTotalBytes / 1024 / 1024);
        const heapAvailableMegaBytes = Math.floor(heapAvailableBytes / 1024 / 1024);
        const heapUsedMegaBytes = Math.floor(heapUsedBytes / 1024 / 1024);
        result = {
            ...result,
            heapTotalMegaBytes,
            heapAvailableMegaBytes,
            heapUsedMegaBytes,
        };

        type LoggerType = typeof logger;
        let logMethod: LoggerType['debug'] | LoggerType['warn'] | LoggerType['error'];
        if (usedMemoryPercent > errorThreshold) {
            logMethod = logger.error;
        } else if (usedMemoryPercent > warningThreshold) {
            logMethod = logger.warn;
        } else if (usedMemoryPercent > debugThreshold) {
            logMethod = logger.debug;
        } else {
            logger.error(`getMemoryStatistics got into min threshold but does not meet any threshold: ${usedMemoryPercent}`);
            return result;
        }

        const output = {
            usedMemoryPercent: `${usedMemoryPercent.toFixed(1)}%`,
            heapTotalMegaBytes: `${heapTotalMegaBytes}MB`,
            heapAvailableMegaBytes: `${heapAvailableMegaBytes}MB`,
            heapUsedMegaBytes: `${heapUsedMegaBytes}MB`,
        };
        logMethod(`Memory Usage: ${JSON.stringify (output, null, 2)}`);
    }
    return result;
};

export const runMemoryCheckDaemon = (): void => {
    if (minThreshold >= 100 || memoryDaemonInterval < 1000) {
        return;        
    }
    // for benchmarking purposes
    // When starting up the first few (I saw 3) take a little more time (I saw 5ms, 2ms, 2ms)
    // After the first few (and when the server is not being choked) the method takes between 0 and 1ms
    // setInterval(() => {
    //     console.time('TOMTOM');
    //     getMemoryStatistics();
    //     console.timeEnd('TOMTOM');
    // }, 10000);

    setInterval(getMemoryStatistics, memoryDaemonInterval);
};
export const runAllDaemon = (): void => {
    runMemoryCheckDaemon();
};
