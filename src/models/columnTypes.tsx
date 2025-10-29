export default () => {
  const straightGaugeColumnTypes = [
    { name: 'ExtraCol1', label: '道岔前第一尺', hidden: false },
    { name: 'ExtraCol2', label: '道岔前第二尺', hidden: false },
    { name: 'SlopeEndCol', label: '顺坡终点', hidden: false },
    { name: 'SwitchTipCol', label: '尖轨尖', hidden: false },
    { name: 'SwitchMiddleCol', label: '尖轨中', hidden: false },
    { name: 'SwitchHeelCol', label: '尖轨跟', hidden: false },
    { name: 'LeadCurveFrontCol', label: '导曲前', hidden: false },
    { name: 'LeadCurveMiddleCol', label: '导曲中', hidden: false },
    { name: 'LeadCurveRearCol', label: '导曲后', hidden: false },
    { name: 'FrogFrontCol', label: '辙岔前', hidden: false },
    { name: 'FrogMiddleCol', label: '辙岔中', hidden: false },
    { name: 'FrogRearCol', label: '辙岔后', hidden: false },
    { name: 'CheckIntervalCol', label: '查照间隔', hidden: false },
    { name: 'GuardDistanceCol', label: '护背距离', hidden: false },
    { name: 'FirstFootStraightBackCol', label: '直后第一尺', hidden: false },
    { name: 'SecondFootStraightBackCol', label: '直后第二尺', hidden: false },
  ];
  const straightHorizontalColumnTypes = [
    { name: 'ExtraCol1', label: '道岔前第一尺', hidden: false },
    { name: 'ExtraCol2', label: '道岔前第二尺', hidden: false },
    { name: 'SlopeEndCol', label: '顺坡终点', hidden: false },
    { name: 'SwitchTipCol', label: '尖轨尖', hidden: false },
    { name: 'SwitchMiddleCol', label: '尖轨中', hidden: true },
    { name: 'SwitchHeelCol', label: '尖轨跟', hidden: false },
    { name: 'LeadCurveFrontCol', label: '导曲前', hidden: false },
    { name: 'LeadCurveMiddleCol', label: '导曲中', hidden: false },
    { name: 'LeadCurveRearCol', label: '导曲后', hidden: false },
    { name: 'FrogFrontCol', label: '辙岔前', hidden: false },
    { name: 'FrogMiddleCol', label: '辙岔中', hidden: true },
    { name: 'FrogRearCol', label: '辙岔后', hidden: false },
    { name: 'CheckIntervalCol', label: '查照间隔', hidden: true },
    { name: 'GuardDistanceCol', label: '护背距离', hidden: true },
    { name: 'FirstFootStraightBackCol', label: '直后第一尺', hidden: false },
    { name: 'SecondFootStraightBackCol', label: '直后第二尺', hidden: false },
  ];

  const curvedGaugeColumnTypes = [
    { name: 'ExtraCol1', label: '额外列1', hidden: true },
    { name: 'ExtraCol2', label: '额外列2', hidden: true },
    { name: 'SlopeEndCol', label: '顺坡终点', hidden: true },
    { name: 'SwitchTipCol', label: '尖轨尖', hidden: true },
    { name: 'SwitchMiddleCol', label: '尖轨中', hidden: true },
    { name: 'SwitchHeelCol', label: '尖轨跟', hidden: false },
    { name: 'LeadCurveFrontCol', label: '导曲前', hidden: false },
    { name: 'LeadCurveMiddleCol', label: '导曲中', hidden: false },
    { name: 'LeadCurveRearCol', label: '导曲后', hidden: false },
    { name: 'FrogFrontCol', label: '辙岔前', hidden: false },
    { name: 'FrogMiddleCol', label: '辙岔中', hidden: false },
    { name: 'FrogRearCol', label: '辙岔后', hidden: false },
    { name: 'CheckIntervalCol', label: '查照间隔', hidden: false },
    { name: 'GuardDistanceCol', label: '护背距离', hidden: false },
    { name: 'FirstFootCurvedBackCol', label: '曲后第一尺', hidden: false },
    { name: 'SecondFootCurvedBackCol', label: '曲后第二尺', hidden: false },
  ];
  const curvedHorizontalColumnTypes = [
    { name: 'ExtraCol1', label: '额外列1', hidden: true },
    { name: 'ExtraCol2', label: '额外列2', hidden: true },
    { name: 'SlopeEndCol', label: '顺坡终点', hidden: true },
    { name: 'SwitchTipCol', label: '尖轨尖', hidden: true },
    { name: 'SwitchMiddleCol', label: '尖轨中', hidden: true },
    { name: 'SwitchHeelCol', label: '尖轨跟', hidden: false },
    { name: 'LeadCurveFrontCol', label: '导曲前', hidden: false },
    { name: 'LeadCurveMiddleCol', label: '导曲中', hidden: false },
    { name: 'LeadCurveRearCol', label: '导曲后', hidden: false },
    { name: 'FrogFrontCol', label: '辙岔前', hidden: false },
    { name: 'FrogMiddleCol', label: '辙岔中', hidden: true },
    { name: 'FrogRearCol', label: '辙岔后', hidden: false },
    { name: 'CheckIntervalCol', label: '查照间隔', hidden: true },
    { name: 'GuardDistanceCol', label: '护背距离', hidden: true },
    { name: 'FirstFootCurvedBackCol', label: '曲后第一尺', hidden: false },
    { name: 'SecondFootCurvedBackCol', label: '曲后第二尺', hidden: false },
  ];
  const offsetColumnTypes = [
    { name: 'offsetColumn1', label: '支距列1', hidden: false },
    { name: 'offsetColumn2', label: '支距列2', hidden: false },
    { name: 'offsetColumn3', label: '支距列3', hidden: false },
    { name: 'offsetColumn4', label: '支距列4', hidden: false },
    { name: 'offsetColumn5', label: '支距列5', hidden: false },
    { name: 'offsetColumn6', label: '支距列6', hidden: false },
    { name: 'offsetColumn7', label: '支距列7', hidden: false },
    { name: 'offsetColumn8', label: '支距列8', hidden: false },
    { name: 'offsetColumn9', label: '支距列9', hidden: false },
  ];
  const straightReducedValueOfSwitchRailColumnTypes = [
    { name: 'reducedValueOfSwitchRail1', label: '直轨尖减值1', hidden: false },
    { name: 'reducedValueOfSwitchRail2', label: '直轨尖减值2', hidden: false },
    { name: 'reducedValueOfSwitchRail3', label: '直轨尖减值3', hidden: false },
    { name: 'reducedValueOfSwitchRail4', label: '直轨尖减值4', hidden: false },
    { name: 'reducedValueOfSwitchRail5', label: '直轨尖减值5', hidden: false },
    {
      name: 'spacingBetweentracks&GuardRails1',
      label: '直轨护轨间隔1',
      hidden: false,
    },
    {
      name: 'spacingBetweentracks&GuardRails2',
      label: '直轨护轨间隔2',
      hidden: false,
    },
    {
      name: 'spacingBetweentracks&WingrRails',
      label: '直轨翼轨间隔',
      hidden: false,
    },
  ];
  const curvedReducedValueOfSwitchRailColumnTypes = [
    { name: 'reducedValueOfSwitchRail1', label: '曲轨尖减值1', hidden: false },
    { name: 'reducedValueOfSwitchRail2', label: '曲轨尖减值2', hidden: false },
    { name: 'reducedValueOfSwitchRail3', label: '曲轨尖减值3', hidden: false },
    { name: 'reducedValueOfSwitchRail4', label: '曲轨尖减值4', hidden: false },
    { name: 'reducedValueOfSwitchRail5', label: '曲轨尖减值5', hidden: false },
    {
      name: 'spacingBetweentracks&GuardRails1',
      label: '曲轨护轨间隔1',
      hidden: false,
    },
    {
      name: 'spacingBetweentracks&GuardRails2',
      label: '曲轨护轨间隔2',
      hidden: false,
    },
    {
      name: 'spacingBetweentracks&WingrRails',
      label: '曲轨翼轨间隔',
      hidden: false,
    },
  ];

  const straightGuardRailFlangeGrooveColumnTypes = [
    { name: 'guardRailFlangeGroove1', label: '直轨护轨轮缘槽1', hidden: false },
    { name: 'guardRailFlangeGroove2', label: '直轨护轨轮缘槽2', hidden: false },
    { name: 'guardRailFlangeGroove3', label: '直轨护轨轮缘槽3', hidden: false },
    { name: 'guardRailFlangeGroove4', label: '直轨护轨轮缘槽4', hidden: false },
    { name: 'guardRailFlangeGroove5', label: '直轨护轨轮缘槽5', hidden: false },
    { name: 'guardrailWear', label: '护轨磨耗', hidden: false },
    { name: 'wingRailVerticalGrinding', label: '翼轨垂磨', hidden: false },
    { name: 'verticalGrindingOfHeartRail', label: '心轨垂磨', hidden: false },
  ];

  const curvedGuardRailFlangeGrooveColumnTypes = [
    { name: 'guardRailFlangeGroove1', label: '曲轨护轨轮缘槽1', hidden: false },
    { name: 'guardRailFlangeGroove2', label: '曲轨护轨轮缘槽2', hidden: false },
    { name: 'guardRailFlangeGroove3', label: '曲轨护轨轮缘槽3', hidden: false },
    { name: 'guardRailFlangeGroove4', label: '曲轨护轨轮缘槽4', hidden: false },
    { name: 'guardRailFlangeGroove5', label: '曲轨护轨轮缘槽5', hidden: false },
    { name: 'guardrailWear', label: '护轨磨耗', hidden: false },
    { name: 'wingRailVerticalGrinding', label: '翼轨垂磨', hidden: false },
    { name: 'verticalGrindingOfHeartRail', label: '心轨垂磨', hidden: false },
  ];

  const otherColumnTypes = [
    { name: '', label: '高低（三角坑）、轨向', hidden: false },
    { name: '', label: '岔枕', hidden: false },
    { name: '', label: '绝缘接头', hidden: false },
    { name: '', label: '钢轨、轨件', hidden: false },
    { name: '', label: '标志', hidden: false },
    { name: '', label: '连接零件', hidden: false },
    { name: '', label: '道床', hidden: false },
    { name: '', label: '其他问题', hidden: false },
  ];

  function getStraightGaugeColumnTypes() {
    return straightGaugeColumnTypes.filter((col) => !col.hidden);
  }
  function getStraightHorizontalColumnTypes() {
    return straightHorizontalColumnTypes.filter((col) => !col.hidden);
  }
  function getCurvedGaugeColumnTypes() {
    return curvedGaugeColumnTypes.filter((col) => !col.hidden);
  }
  function getCurvedHorizontalColumnTypes() {
    return curvedHorizontalColumnTypes.filter((col) => !col.hidden);
  }
  function getOffsetColumnTypes() {
    return offsetColumnTypes.filter((col) => !col.hidden);
  }
  function getStraightReducedValueOfSwitchRailColumnTypes() {
    return straightReducedValueOfSwitchRailColumnTypes.filter(
      (col) => !col.hidden,
    );
  }
  function getCurvedReducedValueOfSwitchRailColumnTypes() {
    return curvedReducedValueOfSwitchRailColumnTypes.filter(
      (col) => !col.hidden,
    );
  }
  function getStraightGuardRailFlangeGrooveColumnTypes() {
    return straightGuardRailFlangeGrooveColumnTypes.filter(
      (col) => !col.hidden,
    );
  }
  function getOtherColumnTypes() {
    return otherColumnTypes.filter((col) => !col.hidden);
  }
  function getCurvedGuardRailFlangeGrooveColumnTypes() {
    return curvedGuardRailFlangeGrooveColumnTypes.filter((col) => !col.hidden);
  }

  return {
    getStraightGaugeColumnTypes,
    getStraightHorizontalColumnTypes,
    getCurvedGaugeColumnTypes,
    getCurvedHorizontalColumnTypes,
    getOffsetColumnTypes,
    getStraightReducedValueOfSwitchRailColumnTypes,
    getCurvedReducedValueOfSwitchRailColumnTypes,
    getStraightGuardRailFlangeGrooveColumnTypes,
    getCurvedGuardRailFlangeGrooveColumnTypes,
    getOtherColumnTypes,
  };
};
