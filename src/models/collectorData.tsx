export default () => {
  type NumericData = Record<string, string | number | undefined>;
  type StringData = Record<string, string>;
  type StepStatus = Array<'process' | 'wait' | 'finish' | 'error'>;

  // Existing categories
  let straightGauge: NumericData = {};
  let straightHorizontal: NumericData = {};
  let curvedGauge: NumericData = {};
  let curvedHorizontal: NumericData = {};

  // New categories
  let offsetData: NumericData = {};
  let straightReducedValue: NumericData = {};
  let curvedReducedValue: NumericData = {};
  let straightGuardRailFlangeGroove: NumericData = {};
  let curvedGuardRailFlangeGroove: NumericData = {};
  let otherData: StringData = {};

  // Step status persistence
  let stepStatus: StepStatus = [
    'process',
    'wait',
    'wait',
    'wait',
    'wait',
    'wait',
  ];

  // Setters
  function setStraightGauge(data: NumericData) {
    straightGauge = data;
  }
  function setStraightHorizontal(data: NumericData) {
    straightHorizontal = data;
  }
  function setCurvedGauge(data: NumericData) {
    curvedGauge = data;
  }
  function setCurvedHorizontal(data: NumericData) {
    curvedHorizontal = data;
  }

  function setOffsetData(data: NumericData) {
    offsetData = data;
  }
  function setStraightReducedValue(data: NumericData) {
    straightReducedValue = data;
  }
  function setCurvedReducedValue(data: NumericData) {
    curvedReducedValue = data;
  }
  function setStraightGuardRailFlangeGroove(data: NumericData) {
    straightGuardRailFlangeGroove = data;
  }
  function setCurvedGuardRailFlangeGroove(data: NumericData) {
    curvedGuardRailFlangeGroove = data;
  }
  function setOtherData(data: StringData) {
    otherData = data;
  }

  function setStepStatus(status: StepStatus) {
    stepStatus = status;
  }

  // Getters (return JSON strings to match existing usage)
  function getStraightGauge() {
    return JSON.stringify(straightGauge);
  }
  function getStraightHorizontal() {
    return JSON.stringify(straightHorizontal);
  }
  function getCurvedGauge() {
    return JSON.stringify(curvedGauge);
  }
  function getCurvedHorizontal() {
    return JSON.stringify(curvedHorizontal);
  }

  function getOffsetData() {
    return JSON.stringify(offsetData);
  }
  function getStraightReducedValue() {
    return JSON.stringify(straightReducedValue);
  }
  function getCurvedReducedValue() {
    return JSON.stringify(curvedReducedValue);
  }
  function getStraightGuardRailFlangeGroove() {
    return JSON.stringify(straightGuardRailFlangeGroove);
  }
  function getCurvedGuardRailFlangeGroove() {
    return JSON.stringify(curvedGuardRailFlangeGroove);
  }
  function getOtherData() {
    return JSON.stringify(otherData);
  }

  function getStepStatus() {
    return JSON.stringify(stepStatus);
  }

  return {
    // setters
    setStraightGauge,
    setStraightHorizontal,
    setCurvedGauge,
    setCurvedHorizontal,
    setOffsetData,
    setStraightReducedValue,
    setCurvedReducedValue,
    setStraightGuardRailFlangeGroove,
    setCurvedGuardRailFlangeGroove,
    setOtherData,
    setStepStatus,
    // getters
    getStraightGauge,
    getStraightHorizontal,
    getCurvedGauge,
    getCurvedHorizontal,
    getOffsetData,
    getStraightReducedValue,
    getCurvedReducedValue,
    getStraightGuardRailFlangeGroove,
    getCurvedGuardRailFlangeGroove,
    getOtherData,
    getStepStatus,
  };
};
