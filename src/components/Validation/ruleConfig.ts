// ruleConfig.ts
import { DataValidator } from './validator';
import { RangeRule, TypeRule, SumRangeRule, LessThanOrEqualRule, GreaterThanOrEqualRule, TriangleDepressionRule, RequiredEmptyRule } from './rules';
import { ColumnType } from './types';

export class RuleConfigurator {
    /**
     * 配置轨距表的验证规则
     * @param validator 数据验证器实例
     * @param columns 列类型数组，包含所有需要配置的列信息
     */
    static configureRailRules(validator: DataValidator, columns: ColumnType[]): void {
        // 配置轨距表的规则
        const railRules = [
            { column: 'SlopeEndCol', min: -3, max: 6 },      // 坡度结束列，取值范围-3到6
            { column: 'SwitchTipCol', min: -3, max: 6 },     // 尖轨尖端列，取值范围-3到6
            { column: 'SwitchMiddleCol', min: -3, max: 6 },  // 尖轨中部列，取值范围-3到6
            { column: 'SwitchHeelCol', min: -3, max: 6 },    // 尖轨跟部列，取值范围-3到6
            { column: 'LeadCurveFrontCol', min: -3, max: 6 },// 导曲线前部列，取值范围-3到6
            { column: 'LeadCurveMiddleCol', min: -3, max: 6 },// 导曲线中部列，取值范围-3到6
            { column: 'LeadCurveRearCol', min: -3, max: 6 }, // 导曲线后部列，取值范围-3到6
            { column: 'FrogFrontCol', min: -3, max: 6 },     // 辙叉前部列，取值范围-3到6
            { column: 'FrogMiddleCol', min: -3, max: 6 },    // 辙叉中部列，取值范围-3到6
            { column: 'FrogRearCol', min: -3, max: 6 },      // 辙叉后部列，取值范围-3到6
            // { column: 'CheckIntervalCol', min: 0, max: 50 }, // 查照间隔列，取值范围0到50（已注释）
            // { column: 'GuardDistanceCol', min: 0, max: 50 }  // 护背距离列，取值范围0到50（已注释）
        ];

        // 遍历轨距规则数组，为每个规则添加验证条件
        railRules.forEach(rule => {
            // 查找对应的列
            const column = columns.find(c => c.name === rule.column);
            // 如果列存在且未隐藏，则添加验证规则
            if (column && !column.hidden) {
                // 添加数值范围验证规则
                validator.addColumnRule(
                    rule.column,
                    new RangeRule(`${rule.column}_range`, rule.column, rule.min, rule.max)
                );
                // 添加数据类型验证规则（必须是数字）
                validator.addColumnRule(
                    rule.column,
                    new TypeRule(`${rule.column}_type`, rule.column, 'number')
                );
            }
        });
        // 为查照间隔列添加最大值验证规则（最大值为48）
        validator.addColumnRule(
            'CheckIntervalCol',
            new LessThanOrEqualRule('CheckIntervalCol_less_than_or_equal', 'CheckIntervalCol', 48)
        );
        // 为护背距离列添加最小值验证规则（最小值为91）
        validator.addColumnRule(
            'GuardDistanceCol',
            new GreaterThanOrEqualRule('GuardDistanceCol_greater_than_or_equal', 'GuardDistanceCol', 91)
        );

        // 添加行级规则 - 查照间隔和护背距离之和应在特定范围
        validator.addRowRule(
            new SumRangeRule(
                'CheckInterval_GuardDistance_sum',
                'CheckIntervalCol',
                'GuardDistanceCol',
                40,
                60
            )
        );
    }

    /**
     * 配置水平表的验证规则
     * @param validator 数据验证器实例
     * @param columns 列配置数组
     */
    static configureHorizontalRules(validator: DataValidator, columns: ColumnType[]): void {
        // 配置水平表的规则
        const horizontalRules = [
            { column: 'ExtraCol1', min: -9, max: 9 },    // 额外列1的取值范围
            { column: 'ExtraCol2', min: -9, max: 9 },    // 额外列2的取值范围
            { column: 'SlopeEndCol', min: -9, max: 9 },  // 坡度结束列的取值范围
            { column: 'SwitchTipCol', min: -9, max: 9 }, // 尖轨尖端列的取值范围
            { column: 'SwitchMiddleCol', min: -9, max: 9 }, // 尖轨中部列的取值范围
            { column: 'SwitchHeelCol', min: -9, max: 9 },  // 尖轨跟端列的取值范围
            { column: 'LeadCurveFrontCol', min: -9, max: 9 }, // 导曲线前部列的取值范围
            { column: 'LeadCurveMiddleCol', min: -9, max: 9 }, // 导曲线中部列的取值范围
            { column: 'LeadCurveRearCol', min: -9, max: 9 },  // 导曲线后部列的取值范围
            { column: 'FrogFrontCol', min: -9, max: 9 },      // 辙叉前部列的取值范围
            // { column: 'FrogMiddleCol', min: -9, max: 9 },    // 辙叉中部列的取值范围（已注释）
            { column: 'FrogRearCol', min: -9, max: 9 },       // 辙叉后部列的取值范围
            // { column: 'CheckIntervalCol', min: -9, max: 9 }, // 查照间隔列的取值范围（已注释）
            // { column: 'GuardDistanceCol', min: -9, max: 9 }  // 护轨距离列的取值范围（已注释）
        ];

        // 遍历并应用水平规则
        horizontalRules.forEach(rule => {
            const column = columns.find(c => c.name === rule.column);
            // 如果列存在且未隐藏，则添加范围和类型验证规则
            if (column && !column.hidden) {
                validator.addColumnRule(
                    rule.column,
                    new RangeRule(`${rule.column}_range`, rule.column, rule.min, rule.max)
                );
                validator.addColumnRule(
                    rule.column,
                    new TypeRule(`${rule.column}_type`, rule.column, 'number')
                );
            }
        });
        // 为特定列添加必空规则
        validator.addColumnRule(
            'FrogMiddleCol',
            new RequiredEmptyRule('FrogMiddleCol_required_empty', 'FrogMiddleCol')
        );
        validator.addColumnRule(
            'CheckIntervalCol',
            new RequiredEmptyRule('CheckIntervalCol_required_empty', 'CheckIntervalCol')
        );
        validator.addColumnRule(
            'GuardDistanceCol',
            new RequiredEmptyRule('GuardDistanceCol_required_empty', 'GuardDistanceCol')
        );

        // 添加行级规则 - 水平差值和应在特定范围
        validator.addRowRule(
            new SumRangeRule(
                'SwitchTip_SwitchHeel_sum',
                'SwitchTipCol',
                'SwitchHeelCol',
                -3,
                3
            )
        );
        // 添加三角形沉降规则组1
        validator.addRowRule(
            new TriangleDepressionRule(
                'Group1TriangleDepression',
                ['ExtraCol1', 'ExtraCol2', 'SlopeEndCol', 'SwitchTipCol', 'SwitchMiddleCol', 'SwitchHeelCol']
            )
        );
        // 添加三角形沉降规则组2
        validator.addRowRule(
            new TriangleDepressionRule(
                'Group2TriangleDepression',
                ['LeadCurveFrontCol', 'LeadCurveMiddleCol', 'LeadCurveRearCol']
            )
        );
        validator.addRowRule(
            new TriangleDepressionRule(
                'Group3TriangleDepression',
                ['FrogFrontCol', 'FrogMiddleCol', 'FrogRearCol']
            )
        )
    }
}