export default interface Page<T> {
    totalRecords: number;
    totalPages: number;
    previousPage: number;
    nextPage: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    records: T[];
}
