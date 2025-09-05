module.exports = {
  extends: [
    '@nuxtjs/eslint-config-typescript'
  ],
  rules: {
    // セミコロンを必須にする
    'semi': ['error', 'always'],
    
    // if文でブロックを必須にする
    'curly': ['error', 'all'],
    
    // アロー関数で return を明示的にする
    'arrow-body-style': ['error', 'always'],
    
    // アロー関数でブロックを必須にする
    'prefer-arrow-callback': ['error', { 'allowNamedFunctions': false, 'allowUnboundThis': true }],
    
    // 関数の括弧を必須にする
    'func-style': ['error', 'expression'],
    
    // コンマの後にスペース
    'comma-spacing': ['error', { 'before': false, 'after': true }],
    
    // オブジェクトのキーと値の間にスペース
    'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }]
  }
};