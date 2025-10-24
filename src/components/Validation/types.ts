// types.ts
export type ColumnType = {
    name: string;
    label: string;
    hidden: boolean;
};

export type DataRow = Record<string, any>;

export type ValidationRuleType = 'range' | 'type' | 'sum_range' | 'custom' | 'required' | 'required_empty' | 'less_than' | 'less_than_or_equal' | 'greater_than' | 'greater_than_or_equal' | 'triangle_depression' | 'not_equal';

export interface ValidationRule {
    ruleName: string;
    ruleType: ValidationRuleType;
    validate(value: any, rowData: DataRow, rowIndex: number): ValidationError | null;
}

export class ValidationError {
    constructor(
        public columnNames: string[],
        public rowIndex: number,
        public ruleName: string,
        public message: string,
        public timestamp: Date = new Date()
    ) { }

    toString(): string {
        return `[行 ${this.rowIndex + 1}] ${this.columnNames.join(" & ")}: ${this.message}`;
    }
  }