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

  // Record UID for export gating
  let uid: string | null = null;

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
    uid = null;
  }
  function setStraightHorizontal(data: NumericData) {
    straightHorizontal = data;
    uid = null;
  }
  function setCurvedGauge(data: NumericData) {
    curvedGauge = data;
    uid = null;
  }
  function setCurvedHorizontal(data: NumericData) {
    curvedHorizontal = data;
    uid = null;
  }

  function setOffsetData(data: NumericData) {
    offsetData = data;
    uid = null;
  }
  function setStraightReducedValue(data: NumericData) {
    straightReducedValue = data;
    uid = null;
  }
  function setCurvedReducedValue(data: NumericData) {
    curvedReducedValue = data;
    uid = null;
  }
  function setStraightGuardRailFlangeGroove(data: NumericData) {
    straightGuardRailFlangeGroove = data;
    uid = null;
  }
  function setCurvedGuardRailFlangeGroove(data: NumericData) {
    curvedGuardRailFlangeGroove = data;
    uid = null;
  }
  function setOtherData(data: StringData) {
    otherData = data;
    uid = null;
  }

  function setStepStatus(status: StepStatus) {
    stepStatus = status;
  }

  // UID setters/getters
  function setUid(newUid: string | null) {
    uid = newUid ?? null;
  }
  function getUid() {
    return uid ?? '';
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
    setUid,
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
    getUid,
  };
};
