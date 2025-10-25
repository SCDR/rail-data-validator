// validator.ts
import type { DataRow, ValidationError, ValidationRule } from './types';

export class DataValidator {
  private columnRules: Map<string, ValidationRule[]> = new Map();
  private rowRules: ValidationRule[] = [];
  private errors: ValidationError[] = [];

  // 添加列级规则
  /**
   * 为指定列添加验证规则
   * @param columnName - 列名
   * @param rule - 验证规则对象
   */
  addColumnRule(columnName: string, rule: ValidationRule): void {
    // 如果列名在规则映射中不存在，则先创建一个空数组
    if (!this.columnRules.has(columnName)) {
      this.columnRules.set(columnName, []);
    }
    // 将验证规则添加到对应列名的规则数组中
    this.columnRules.get(columnName)?.push(rule);
  }

  // 添加行级规则
  /**
   * 添加行验证规则
   * @param rule 需要添加的验证规则对象
   */
  addRowRule(rule: ValidationRule): void {
    // 定义一个添加行规则的方法，接收一个ValidationRule类型的参数，没有返回值
    this.rowRules.push(rule); // 将传入的规则添加到rowRules数组中
  }

  // 校验单行数据
  validateRow(rowData: DataRow, rowIndex: number): ValidationError[] {
    const rowErrors: ValidationError[] = [];

    // 校验列级规则
    for (const [columnName, rules] of this.columnRules) {
      const value = rowData[columnName];

      for (const rule of rules) {
        const error = rule.validate(value, rowData, rowIndex);
        if (error) {
          rowErrors.push(error);
        }
      }
    }

    // 校验行级规则
    for (const rule of this.rowRules) {
      const error = rule.validate(null, rowData, rowIndex);
      if (error) {
        rowErrors.push(error);
      }
    }

    return rowErrors;
  }

  // 校验整个数据集
  /**
   * 验证所有数据行
   * @param data - 需要验证的数据行数组
   * @returns 返回验证错误数组，如果没有错误则为空数组
   */
  validateAll(data: DataRow[]): ValidationError[] {
    // 初始化错误数组
    this.errors = [];

    // 遍历所有数据行进行验证
    for (let i = 0; i < data.length; i++) {
      // 验证单行数据并获取错误信息
      const rowErrors = this.validateRow(data[i], i);
      // 将当前行的错误信息添加到总错误数组中
      this.errors.push(...rowErrors);
    }

    return this.errors;
  }

  // 获取错误统计
  /**
   * 获取错误统计信息
   * 该方法用于统计验证错误的分布情况，包括按列、按规则和按行的统计
   * @returns 返回一个包含错误统计信息的对象，包含按列、按规则、按行的统计以及总错误数
   */
  getErrorStatistics(): {
    byColumn: Record<string, { count: number; errors: ValidationError[] }>; // 按列统计的错误信息
    byRule: Record<string, { count: number; errors: ValidationError[] }>; // 按规则统计的错误信息
    byRow: Record<string, { count: number; errors: ValidationError[] }>; // 按行统计的错误信息
    total: number; // 总错误数量
  } {
    // 初始化统计对象，包含按列、按规则、按行的统计和总错误数
    const stats = {
      byColumn: {} as Record<
        string,
        { count: number; errors: ValidationError[] }
      >,
      byRule: {} as Record<
        string,
        { count: number; errors: ValidationError[] }
      >,
      byRow: {} as Record<string, { count: number; errors: ValidationError[] }>,
      total: this.errors.length, // 总错误数为所有错误的数量
    };

    // 遍历所有错误进行统计
    for (const error of this.errors) {
      // 按列统计错误信息
      for (const columnName of error.columnNames) {
        // 如果该列还没有统计信息，则初始化
        if (!stats.byColumn[columnName]) {
          stats.byColumn[columnName] = { count: 0, errors: [] };
        }
        // 增加该列的错误计数
        stats.byColumn[columnName].count++;
        // 将当前错误添加到该列的错误列表中
        stats.byColumn[columnName].errors.push(error);
      }

      // 按规则统计错误信息
      // 创建规则键，由规则名和列名组成
      const ruleKey = `${error.ruleName}_${error.columnNames.join('_')}`;
      // 如果该规则还没有统计信息，则初始化
      if (!stats.byRule[ruleKey]) {
        stats.byRule[ruleKey] = { count: 0, errors: [] };
      }
      // 增加该规则下的错误计数
      stats.byRule[ruleKey].count++;
      // 将当前错误添加到该规则下的错误列表中
      stats.byRule[ruleKey].errors.push(error);

      // 按行统计错误信息
      // 创建行键，使用行索引的字符串形式
      const rowKey = error.rowIndex.toString();
      // 如果该行还没有统计信息，则初始化
      if (!stats.byRow[rowKey]) {
        stats.byRow[rowKey] = { count: 0, errors: [] };
      }
      // 增加该行的错误计数
      stats.byRow[rowKey].count++;
      // 将当前错误添加到该行的错误列表中
      stats.byRow[rowKey].errors.push(error);
    }

    // 返回统计结果
    return stats;
  }
}
