// ruleConfig.ts

import {
  ComparisonRule,
  RangeRule,
  RequiredEmptyRule,
  TriangleDepressionRule,
  TypeRule,
  CustomRule,
} from './rules';
import type { ColumnType } from './types';
import { ValidationError } from './types';
import type { DataValidator } from './validator';
import fixedColumnData from '@/models/fixedColumnData';

export class RuleConfigurator {
  /**
   * 配置轨距表的验证规则
   * @param validator 数据验证器实例
   * @param columns 列类型数组，包含所有需要配置的列信息
   */
  static configureRailRules(
    validator: DataValidator,
    columns: ColumnType[],
  ): void {
    // 配置轨距表的规则
    const railRangeRules = [
      { column: 'SlopeEndCol', min: -3, max: 6 }, // 坡度结束列，取值范围-3到6
      { column: 'SwitchTipCol', min: -3, max: 6 }, // 尖轨尖端列，取值范围-3到6
      { column: 'SwitchMiddleCol', min: -3, max: 6 }, // 尖轨中部列，取值范围-3到6
      { column: 'SwitchHeelCol', min: -3, max: 6 }, // 尖轨跟部列，取值范围-3到6
      { column: 'LeadCurveFrontCol', min: -3, max: 6 }, // 导曲线前部列，取值范围-3到6
      { column: 'LeadCurveMiddleCol', min: -3, max: 6 }, // 导曲线中部列，取值范围-3到6
      { column: 'LeadCurveRearCol', min: -3, max: 6 }, // 导曲线后部列，取值范围-3到6
      { column: 'FrogFrontCol', min: -3, max: 6 }, // 辙叉前部列，取值范围-3到6
      { column: 'FrogMiddleCol', min: -3, max: 6 }, // 辙叉中部列，取值范围-3到6
      { column: 'FrogRearCol', min: -3, max: 6 }, // 辙叉后部列，取值范围-3到6
      // { column: 'CheckIntervalCol', min: 0, max: 50 }, // 查照间隔列，取值范围0到50（已注释）
      // { column: 'GuardDistanceCol', min: 0, max: 50 }  // 护背距离列，取值范围0到50（已注释）
      { column: 'FirstFootStraightBackCol', min: -3, max: 6 },
      { column: 'SecondFootStraightBackCol', min: -3, max: 6 },
    ];

    const railColumns = [
      'ExtraCol1',
      'ExtraCol2',
      'SlopeEndCol',
      'SwitchTipCol',
      'SwitchMiddleCol',
      'SwitchHeelCol',
      'LeadCurveFrontCol',
      'LeadCurveMiddleCol',
      'LeadCurveRearCol',
      'FrogFrontCol',
      'FrogMiddleCol',
      'FrogRearCol',
      'CheckIntervalCol',
      'GuardDistanceCol',
      'FirstFootStraightBackCol',
      'SecondFootStraightBackCol',
    ];

    // 通过列配置推断轨型（用于参考值选择）
    const isCurved = columns.some(
      (c) =>
        c.name === 'FirstFootCurvedBackCol' ||
        c.name === 'SecondFootCurvedBackCol',
    );
    const trackType: 'straight' | 'curved' = isCurved ? 'curved' : 'straight';
    // 遍历轨距规则数组，为每个规则添加验证条件
    railRangeRules.forEach((rule) => {
      // 查找对应的列
      const column = columns.find((c) => c.name === rule.column);
      // 如果列存在且未隐藏，则添加验证规则
      if (column && !column.hidden) {
        // 添加数值范围验证规则
        validator.addColumnRule(
          rule.column,
          new RangeRule(
            `${rule.column}_range`,
            rule.column,
            rule.min,
            rule.max,
          ),
        );
        // 添加数据类型验证规则（必须是数字）
        validator.addColumnRule(
          rule.column,
          new TypeRule(`${rule.column}_type`, rule.column, 'number'),
        );
      }
    });

    // 为每一列添加“当前值 + 参考值 < 1456”的自定义规则
    railColumns.forEach((colName) => {
      const column = columns.find((c) => c.name === colName);
      if (!column || column.hidden) return;

      validator.addColumnRule(
        colName,
        new CustomRule(
          `${colName}_sum_with_reference_less_than_1456`,
          colName,
          (
            value: any,
            rowData: Record<string, any>,
            rowIndex: number,
          ): ValidationError | null => {
            // 值转换为数字（支持字符串数字）
            let vNum: number | null = null;
            if (typeof value === 'number') {
              vNum = Number.isNaN(value) ? null : value;
            } else if (typeof value === 'string' && value.trim() !== '') {
              const parsed = Number(value);
              vNum = Number.isNaN(parsed) ? null : parsed;
            }
            if (vNum === null) return null; // 留给 TypeRule 报错或视为空值跳过

            const dsId: string = (rowData?.datasetId as string) || 'default';
            const refRaw = fixedColumnData.getFixedValue(dsId, colName, {
              trackType,
            });
            const rNum =
              typeof refRaw === 'number'
                ? refRaw
                : typeof refRaw === 'string' && refRaw.trim() !== ''
                  ? Number(refRaw)
                  : null;
            if (rNum === null || Number.isNaN(rNum)) return null; // 无参考或不可解析则跳过

            const sum = vNum + rNum;
            if (sum >= 1456) {
              return new ValidationError(
                [colName],
                rowIndex,
                `${colName}_sum_with_reference_less_than_1456_fatal`,
                `当前值(${vNum})与参考值(${rNum})之和必须小于1456，目前为 ${sum}`,
              );
            }
            return null;
          },
        ),
      );
    });
    // 为查照间隔列添加最大值验证规则
    validator.addColumnRule(
      'CheckIntervalCol',
      new ComparisonRule(
        'CheckIntervalCol_comparison',
        'CheckIntervalCol',
        '>=',
        91,
      ),
      // new LessThanOrEqualRule('CheckIntervalCol_less_than_or_equal', 'CheckIntervalCol', 48)
    );
    // 为护背距离列添加最小值验证规则
    validator.addColumnRule(
      'GuardDistanceCol',
      new ComparisonRule(
        'GuardDistanceCol_comparison',
        'GuardDistanceCol',
        '<=',
        48,
      ),
      // new GreaterThanOrEqualRule('GuardDistanceCol_greater_than_or_equal', 'GuardDistanceCol', 91)
    );

    // 添加行级规则 - 查照间隔和护背距离之和应在特定范围
    // validator.addRowRule(
    //   new SumRangeRule(
    //     'CheckInterval_GuardDistance_sum',
    //     'CheckIntervalCol',
    //     'GuardDistanceCol',
    //     40,
    //     60,
    //   ),
    // );
  }

  /**
   * 配置水平表的验证规则
   * @param validator 数据验证器实例
   * @param columns 列配置数组
   */
  static configureHorizontalRules(
    validator: DataValidator,
    columns: ColumnType[],
  ): void {
    // 配置水平表的规则
    // 通过列集是否包含曲轨专有列来判断当前是否为曲轨水平规则环境
    const isCurvedHorizontal = columns.some(
      (c) =>
        c.name === 'FirstFootCurvedBackCol' ||
        c.name === 'SecondFootCurvedBackCol',
    );

    const horizontalRangeRules = [
      { column: 'ExtraCol1', min: -9, max: 9 }, // 额外列1的取值范围
      { column: 'ExtraCol2', min: -9, max: 9 }, // 额外列2的取值范围
      { column: 'SlopeEndCol', min: -9, max: 9 }, // 坡度结束列的取值范围
      { column: 'SwitchTipCol', min: -9, max: 9 }, // 尖轨尖端列的取值范围
      { column: 'SwitchMiddleCol', min: -9, max: 9 }, // 尖轨中部列的取值范围
      { column: 'SwitchHeelCol', min: -9, max: 9 }, // 尖轨跟端列的取值范围
      { column: 'LeadCurveFrontCol', min: -9, max: 9 }, // 导曲线前部列的取值范围
      { column: 'LeadCurveMiddleCol', min: -9, max: 9 }, // 导曲线中部列的取值范围
      { column: 'LeadCurveRearCol', min: -9, max: 9 }, // 导曲线后部列的取值范围
      { column: 'FrogFrontCol', min: -9, max: 9 }, // 辙叉前部列的取值范围
      // { column: 'FrogMiddleCol', min: -9, max: 9 },    // 辙叉中部列的取值范围（已注释）
      { column: 'FrogRearCol', min: -9, max: 9 }, // 辙叉后部列的取值范围
      // { column: 'CheckIntervalCol', min: -9, max: 9 }, // 查照间隔列的取值范围（已注释）
      // { column: 'GuardDistanceCol', min: -9, max: 9 }  // 护轨距离列的取值范围（已注释）
      { column: 'FirstFootStraightBackCol', min: -9, max: 9 },
      { column: 'SecondFootStraightBackCol', min: -9, max: 9 },
    ];

    // 遍历并应用水平规则
    horizontalRangeRules.forEach((rule) => {
      const column = columns.find((c) => c.name === rule.column);
      // 如果列存在且未隐藏，则添加范围和类型验证规则
      if (column && !column.hidden) {
        validator.addColumnRule(
          rule.column,
          new RangeRule(
            `${rule.column}_range`,
            rule.column,
            rule.min,
            rule.max,
          ),
        );
        validator.addColumnRule(
          rule.column,
          new TypeRule(`${rule.column}_type`, rule.column, 'number'),
        );
      }
    });
    //
    validator.addColumnRule(
      'CheckIntervalCol',
      new ComparisonRule(
        'CheckIntervalCol_great_than',
        'CheckIntervalCol',
        '>=',
        91,
      ),
    );

    validator.addColumnRule(
      'GuardDistanceCol',
      new ComparisonRule(
        'GuardDistanceCol_less_than',
        'GuardDistanceCol',
        '<=',
        48,
      ),
    );
    // 为特定列添加必空规则
    validator.addColumnRule(
      'FrogMiddleCol',
      new RequiredEmptyRule('FrogMiddleCol_required_empty', 'FrogMiddleCol'),
    );
    validator.addColumnRule(
      'CheckIntervalCol',
      new RequiredEmptyRule(
        'CheckIntervalCol_required_empty',
        'CheckIntervalCol',
      ),
    );
    validator.addColumnRule(
      'GuardDistanceCol',
      new RequiredEmptyRule(
        'GuardDistanceCol_required_empty',
        'GuardDistanceCol',
      ),
    );
    if (isCurvedHorizontal) {
      validator.addColumnRule(
        'LeadCurveFrontCol',
        new ComparisonRule(
          'LeadCurveFrontCol_great_than_fatal',
          'LeadCurveFrontCol',
          '>',
          -3,
        ),
      );
      validator.addColumnRule(
        'LeadCurveMiddleCol',
        new ComparisonRule(
          'LeadCurveMiddleCol_great_than_fatal',
          'LeadCurveMiddleCol',
          '>',
          -3,
        ),
      );
      validator.addColumnRule(
        'LeadCurveRearCol',
        new ComparisonRule(
          'LeadCurveRearCol_great_than_fatal',
          'LeadCurveMiddleCol',
          '>',
          -3,
        ),
      );
    }

    // 添加行级规则 - 水平差值和应在特定范围
    // validator.addRowRule(
    //   new SumRangeRule(
    //     'SwitchTip_SwitchHeel_sum',
    //     'SwitchTipCol',
    //     'SwitchHeelCol',
    //     -3,
    //     3,
    //   ),
    // );
    // 添加三角形沉降规则组1
    validator.addRowRule(
      new TriangleDepressionRule('Group1TriangleDepression', [
        'ExtraCol1',
        'ExtraCol2',
        'SlopeEndCol',
        'SwitchTipCol',
        'SwitchMiddleCol',
        'SwitchHeelCol',
      ]),
    );
    // 添加三角形沉降规则组2
    validator.addRowRule(
      new TriangleDepressionRule('Group2TriangleDepression', [
        'LeadCurveFrontCol',
        'LeadCurveMiddleCol',
        'LeadCurveRearCol',
      ]),
    );
    validator.addRowRule(
      new TriangleDepressionRule('Group3TriangleDepression', [
        'FrogFrontCol',
        'FrogMiddleCol',
        'FrogRearCol',
      ]),
    );
  }

  /**
   * 配置“支距”步骤的验证规则
   * 规则说明：
   * - 每个未隐藏的列必须填写（RequiredRule）
   * - 值类型必须为数字（TypeRule: number）
   * @param validator 数据验证器实例
   * @param columns 支距列配置
   */
  static configureOffsetRules(
    validator: DataValidator,
    columns: ColumnType[],
  ): void {
    const offsetRangeRules = [
      { column: 'offsetColumn1', min: -4, max: 4 },
      { column: 'offsetColumn2', min: -4, max: 4 },
      { column: 'offsetColumn3', min: -4, max: 4 },
      { column: 'offsetColumn4', min: -4, max: 4 },
      { column: 'offsetColumn5', min: -4, max: 4 },
      { column: 'offsetColumn6', min: -4, max: 4 },
      { column: 'offsetColumn7', min: -4, max: 4 },
      { column: 'offsetColumn8', min: -4, max: 4 },
      { column: 'offsetColumn9', min: -4, max: 4 },
    ];
    offsetRangeRules.forEach((rule) => {
      const column = columns.find((c) => c.name === rule.column);
      // 如果列存在且未隐藏，则添加范围和类型验证规则
      if (column && !column.hidden) {
        validator.addColumnRule(
          rule.column,
          new RangeRule(
            `${rule.column}_range`,
            rule.column,
            rule.min,
            rule.max,
          ),
        );
        validator.addColumnRule(
          rule.column,
          new TypeRule(`${rule.column}_type`, rule.column, 'number'),
        );
      }
    });
  }

  /**
   * 配置“尖轨降低值”（直轨/曲轨）步骤的验证规则
   * 规则说明：
   * - 每个未隐藏的列必须填写（RequiredRule）
   * - 值类型必须为数字（TypeRule: number）
   * @param validator 数据验证器实例
   * @param columns 尖轨降低值列配置（直轨或曲轨）
   */
  static configureSwitchRailReducedRules(
    validator: DataValidator,
    columns: ColumnType[],
  ): void {
    const switchRailReducedGeRules = [
      { column: 'reducedValueOfSwitchRail1', ge_than: 0 },
      { column: 'reducedValueOfSwitchRail2', ge_than: 0 },
      { column: 'reducedValueOfSwitchRail3', ge_than: 0 },
    ];
    switchRailReducedGeRules.forEach((rule) => {
      const column = columns.find((c) => c.name === rule.column);
      // 如果列存在且未隐藏，则添加范围和类型验证规则
      if (column && !column.hidden) {
        validator.addColumnRule(
          rule.column,
          new ComparisonRule(`${rule.column}_range`, rule.column, '>=', 0),
        );
        validator.addColumnRule(
          rule.column,
          new TypeRule(`${rule.column}_type`, rule.column, 'number'),
        );
      }
    });
    const switchRailReducedLeRules = [
      { column: 'spacingBetweentracks&GuardRails1', le_than: 0 },
      { column: 'spacingBetweentracks&GuardRails2', le_than: 0 },
      { column: 'spacingBetweentracks&WingrRails', le_than: 0 },
    ];
    switchRailReducedLeRules.forEach((rule) => {
      const column = columns.find((c) => c.name === rule.column);
      // 如果列存在且未隐藏，则添加范围和类型验证规则
      if (column && !column.hidden) {
        validator.addColumnRule(
          rule.column,
          new ComparisonRule(`${rule.column}_range`, rule.column, '<=', 0),
        );
        validator.addColumnRule(
          rule.column,
          new TypeRule(`${rule.column}_type`, rule.column, 'number'),
        );
      }
    });
  }

  /**
   * 配置“护轨轮缘槽”（直轨/曲轨）步骤的验证规则
   * 规则说明：
   * - 每个未隐藏的列必须填写（RequiredRule）
   * - 值类型必须为数字（TypeRule: number）
   * @param validator 数据验证器实例
   * @param columns 护轨轮缘槽列配置（直轨或曲轨）
   */
  static configureGuardRailFlangeGrooveRules(
    validator: DataValidator,
    _columns: ColumnType[],
  ): void {
    validator.addColumnRule(
      'guardRailFlangeGroove1',
      new ComparisonRule(
        'guardRailFlangeGroove1_great_than',
        'guardRailFlangeGroove1',
        '>=',
        80,
      ),
    );
    validator.addColumnRule(
      'guardRailFlangeGroove2',
      new ComparisonRule(
        'guardRailFlangeGroove2_great_than',
        'guardRailFlangeGroove2',
        '>=',
        65,
      ),
    );
    validator.addColumnRule(
      'guardRailFlangeGroove3',
      new ComparisonRule(
        'guardRailFlangeGroove3_great_than',
        'guardRailFlangeGroove3',
        '>=',
        45,
      ),
    );
  }
}
