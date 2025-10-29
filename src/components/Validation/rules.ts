// rules.ts
import {
  type DataRow,
  ValidationError,
  type ValidationRule,
  type ValidationRuleType,
} from './types';

// 范围规则
/**
 * 范围验证规则类，用于验证值是否在指定的最小值和最大值之间
 * 实现了ValidationRule接口，提供范围验证功能
 */
export class RangeRule implements ValidationRule {
  // 规则类型，固定为'range'
  ruleType: ValidationRuleType = 'range';

  constructor(
    public ruleName: string,
    public columnName: string,
    public min: number,
    public max: number,
  ) {}

  validate(
    value: any,
    _rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    if (value === null || value === undefined) return null;

    const num = Number(value);
    if (Number.isNaN(num)) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须是数字，实际为: ${value}`,
      );
    }

    if (num < this.min || num > this.max) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须在 ${this.min} 和 ${this.max} 之间，实际为: ${value}`,
      );
    }

    return null;
  }
}
export class ComparisonRule implements ValidationRule {
  ruleType: ValidationRuleType = 'comparison';
  constructor(
    public ruleName: string,
    public columnName: string,
    public operator: '<' | '>' | '<=' | '>=' | '!=' | '==',
    public value: number,
  ) {}

  validate(
    value: any,
    _rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    if (value === null || value === undefined) return null;

    const num = Number(value);
    if (Number.isNaN(num)) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须是数字，实际为: ${value}`,
      );
    }

    if (this.operator === '<' && num >= this.value) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须小于 ${this.value}，实际为: ${value}`,
      );
    }
    if (this.operator === '>' && num <= this.value) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须大于 ${this.value}，实际为: ${value}`,
      );
    }
    if (this.operator === '<=' && num > this.value) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须小于或等于 ${this.value}，实际为: ${value}`,
      );
    }
    if (this.operator === '>=' && num < this.value) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须大于或等于 ${this.value}，实际为: ${value}`,
      );
    }
    if (this.operator === '!=' && num === this.value) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值不能等于 ${this.value}，实际为: ${value}`,
      );
    }
    if (this.operator === '==' && num !== this.value) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须等于 ${this.value}，实际为: ${value}`,
      );
    }
    return null;
  }
}
//小于规则
/**
 * 小于验证规则类
 * 实现ValidationRule接口，用于验证值是否小于指定最大值
 */
export class LessThanRule implements ValidationRule {
  // 验证规则类型标识
  ruleType: ValidationRuleType = 'less_than';

  constructor(
    public ruleName: string,
    public columnName: string,
    public max: number,
  ) {}

  validate(
    value: any,
    _rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    if (value === null || value === undefined) return null;

    const num = Number(value);
    if (Number.isNaN(num)) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须是数字，实际为: ${value}`,
      );
    }

    if (num >= this.max) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须小于 ${this.max}，实际为: ${value}`,
      );
    }
    return null;
  }
}
//小于等于规则
export class LessThanOrEqualRule implements ValidationRule {
  ruleType: ValidationRuleType = 'less_than_or_equal';

  constructor(
    public ruleName: string,
    public columnName: string,
    public max: number,
  ) {}

  validate(
    value: any,
    _rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    if (value === null || value === undefined) return null;

    const num = Number(value);
    if (Number.isNaN(num)) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须是数字，实际为: ${value}`,
      );
    }

    if (num > this.max) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须小于或等于 ${this.max}，实际为: ${value}`,
      );
    }

    return null;
  }
}

//大于规则
export class GreaterThanRule implements ValidationRule {
  ruleType: ValidationRuleType = 'greater_than';

  constructor(
    public ruleName: string,
    public columnName: string,
    public min: number,
  ) {}

  validate(
    value: any,
    _rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    if (value === null || value === undefined) return null;

    const num = Number(value);
    if (Number.isNaN(num)) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须是数字，实际为: ${value}`,
      );
    }

    if (num <= this.min) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须大于 ${this.min}，实际为: ${value}`,
      );
    }
    return null;
  }
}
//大于等于规则
export class GreaterThanOrEqualRule implements ValidationRule {
  ruleType: ValidationRuleType = 'greater_than_or_equal';

  constructor(
    public ruleName: string,
    public columnName: string,
    public min: number,
  ) {}

  validate(
    value: any,
    _rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    if (value === null || value === undefined) return null;

    const num = Number(value);
    if (Number.isNaN(num)) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须是数字，实际为: ${value}`,
      );
    }

    if (num < this.min) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须大于或等于 ${this.min}，实际为: ${value}`,
      );
    }

    return null;
  }
}
//不等于规则
export class NotEqualRule implements ValidationRule {
  ruleType: ValidationRuleType = 'not_equal';

  constructor(
    public ruleName: string,
    public columnName: string,
    public notEqualValue: any,
  ) {}

  validate(
    value: any,
    _rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    if (value === this.notEqualValue) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值不能等于 ${this.notEqualValue}`,
      );
    }
    return null;
  }
}

//必填规则
export class RequiredRule implements ValidationRule {
  ruleType: ValidationRuleType = 'required';

  constructor(
    public ruleName: string,
    public columnName: string,
  ) {}

  validate(
    value: any,
    _rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    if (value === null || value === undefined || value === '') {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值不能为空`,
      );
    }
    return null;
  }
}

//必须为空规则
export class RequiredEmptyRule implements ValidationRule {
  ruleType: ValidationRuleType = 'required_empty';

  constructor(
    public ruleName: string,
    public columnName: string,
  ) {}

  validate(
    value: any,
    _rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    if (value !== null && value !== undefined && value !== '') {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须为空`,
      );
    }
    return null;
  }
}

export class CustomRule implements ValidationRule {
  ruleType: ValidationRuleType = 'custom';

  constructor(
    public ruleName: string,
    public columnName: string,
    public customValidator: (
      value: any,
      rowData: DataRow,
      rowIndex: number,
    ) => ValidationError | null,
  ) {}

  validate(
    value: any,
    rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    return this.customValidator(value, rowData, rowIndex);
  }
}

// 类型规则
export class TypeRule implements ValidationRule {
  ruleType: ValidationRuleType = 'type';

  constructor(
    public ruleName: string,
    public columnName: string,
    public expectedType: string,
  ) {}

  validate(
    value: any,
    _rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    // 尝试将字符串转换为数字
    if (typeof value === 'string') {
      const num = Number(value);
      if (!Number.isNaN(num)) {
        value = num;
      }
    }

    if (value === null || value === undefined) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `空值${this.columnName}不为${this.expectedType}`,
      );
    }

    const actualType = typeof value;
    if (actualType === 'number' && Number.isNaN(value)) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须是有效的数字，实际为: NaN`,
      );
    }

    if (actualType !== this.expectedType) {
      return new ValidationError(
        [this.columnName],
        rowIndex,
        this.ruleName,
        `值必须是 ${this.expectedType} 类型，实际为: ${actualType}`,
      );
    }

    return null;
  }
}

// 行级规则 - 两列之和范围
export class SumRangeRule implements ValidationRule {
  ruleType: ValidationRuleType = 'sum_range';

  constructor(
    public ruleName: string,
    public columnName1: string,
    public columnName2: string,
    public min: number,
    public max: number,
  ) {}

  validate(
    _value: any,
    rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    const val1 = rowData[this.columnName1];
    const val2 = rowData[this.columnName2];

    if (
      val1 === null ||
      val1 === undefined ||
      val2 === null ||
      val2 === undefined
    ) {
      return null;
    }

    const num1 = Number(val1);
    const num2 = Number(val2);

    if (Number.isNaN(num1) || Number.isNaN(num2)) {
      return new ValidationError(
        [this.columnName1, this.columnName2],
        rowIndex,
        this.ruleName,
        `两列值必须是数字，实际为: ${val1} 和 ${val2}`,
      );
    }

    const sum = num1 + num2;
    if (sum < this.min || sum > this.max) {
      return new ValidationError(
        [this.columnName1, this.columnName2],
        rowIndex,
        this.ruleName,
        `两列之和必须在 ${this.min} 和 ${this.max} 之间，实际为: ${sum}`,
      );
    }

    return null;
  }
}

// 三角坑异常规则
export class TriangleDepressionRule implements ValidationRule {
  ruleType: ValidationRuleType = 'triangle_depression';

  constructor(
    public ruleName: string,
    public columnNames: string[], // 需要检查的列名数组
  ) {}

  validate(
    _value: any,
    rowData: DataRow,
    rowIndex: number,
  ): ValidationError | null {
    // 获取所有数值列的值
    const values: { column: string; value: number }[] = [];

    for (const col of this.columnNames) {
      const val = rowData[col];
      if (val === null || val === undefined) {
        // values.push({ column: col, value: 0 });
        continue;
      }

      const num = Number(val);
      if (Number.isNaN(num)) {
        return new ValidationError(
          [col],
          rowIndex,
          this.ruleName,
          `值必须是数字，实际为: ${val}`,
        );
      }

      values.push({ column: col, value: num });
    }

    // 如果少于2个有效值，无法计算两两之和
    if (values.length < 2) {
      return null;
    }

    // 计算所有两两组合差值的绝对值
    const absDiffs: { columns: string[]; absDiff: number }[] = [];

    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < values.length; j++) {
        const absDiff = Math.abs(values[i].value - values[j].value);
        absDiffs.push({
          columns: [values[i].column, values[j].column],
          absDiff: absDiff,
        });
      }
    }

    // 找出大于9的中的最大值
    const problematicSums = absDiffs.filter((s) => s.absDiff > 9);

    if (problematicSums.length === 0) {
      return null; // 没有大于9的和
    }

    // 找出最大值
    const maxDiff = Math.max(...problematicSums.map((s) => s.absDiff));
    const maxDifPair = problematicSums.find((s) => s.absDiff === maxDiff);

    if (!maxDifPair) {
      return null; // 理论上不会发生
    }

    return new ValidationError(
      maxDifPair.columns,
      rowIndex,
      this.ruleName,
      `三角坑异常: ${maxDifPair.columns.join('-')} = ${maxDifPair.absDiff} > 9`,
    );
  }
}
