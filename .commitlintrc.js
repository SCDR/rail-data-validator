module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: {
    parserOpts: {
      // 支持英文或中文冒号，兼容 "feat: ..." 与 "feat：..."
      headerPattern: /^(\w*)(?:\((.*)\))?[!！]?\s*[:：]\s*(.*)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
};