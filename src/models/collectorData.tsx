export default () => {
  var straightGauge = { 1: 'hhh' };
  var straightHorizontal = {};
  var curvedGauge = {};
  var curvedHorizontal = {};

  function setStraightGauge(data: any) {
    straightGauge = data;
  }
  function setStraightHorizontal(data: any) {
    straightHorizontal = data;
  }
  function setCurvedGauge(data: any) {
    curvedGauge = data;
  }
  function setCurvedHorizontal(data: any) {
    curvedHorizontal = data;
  }
  function getStraightGauge() {
    // 返回json字符串
    return JSON.stringify(straightGauge);
  }
  function getStraightHorizontal() {
    // 返回json字符串
    return JSON.stringify(straightHorizontal);
  }
  function getCurvedGauge() {
    // 返回json字符串
    return JSON.stringify(curvedGauge);
  }
  function getCurvedHorizontal() {
    // 返回json字符串
    return JSON.stringify(curvedHorizontal);
  }
  return {
    setStraightGauge,
    setStraightHorizontal,
    setCurvedGauge,
    setCurvedHorizontal,
    getStraightGauge,
    getStraightHorizontal,
    getCurvedGauge,
    getCurvedHorizontal,
  };
};
