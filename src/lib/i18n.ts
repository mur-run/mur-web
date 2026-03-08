type Locale = 'en' | 'zh-TW' | 'zh-CN';

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Nav
    'nav.dashboard': 'Dashboard',
    'nav.patterns': 'Patterns',
    'nav.workflows': 'Workflows',
    'nav.sessions': 'Sessions',
    'nav.settings': 'Settings',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.back': '← Back',
    'common.steps': 'Steps',
    'common.tools': 'Tools',
    'common.variables': 'Variables',
    'common.name': 'Name',
    'common.description': 'Description',
    'common.required': 'required',
    'common.optional': 'optional',
    'common.default': 'default',
    'common.type': 'Type',
    'common.add': 'Add',
    'common.remove': 'Remove',
    'common.prev': '← Prev',
    'common.next': 'Next →',
    'common.of': 'of',
    'common.searching': 'searching…',
    'common.semantic': '🧠 semantic',
    'common.keyword': '🔤 keyword',

    // Workflows page
    'workflows.title': 'Workflows',
    'workflows.count': '{filtered} of {total} workflows',
    'workflows.new': '+ New Workflow',
    'workflows.newTitle': 'New Workflow',
    'workflows.searchPlaceholder': 'Search workflows (semantic + keyword)...',
    'workflows.namePlaceholder': 'workflow-name',
    'workflows.descPlaceholder': 'What does this workflow do?',
    'workflows.stepPlaceholder': 'Step description',
    'workflows.addStep': '+ Add step',
    'workflows.addVariable': '+ Add variable',
    'workflows.create': 'Create Workflow',
    'workflows.saveChanges': 'Save Changes',
    'workflows.noWorkflows': 'No workflows yet',
    'workflows.noWorkflowsHint': 'Create one to define reusable step sequences',
    'workflows.noMatch': 'No workflows match "{query}"',
    'workflows.noMatchHint': 'Try a different search term',
    'workflows.noVariables': 'No variables detected. Add one to make this workflow reusable.',
    'workflows.noVariablesShort': 'No variables',
    'workflows.varNamePlaceholder': 'name',
    'workflows.varDefaultPlaceholder': 'default',
    'workflows.varDescPlaceholder': 'description',

    // Session Review
    'session.title': 'Session',
    'session.events': 'events',
    'session.extractWorkflow': 'Extract Workflow',
    'session.extracting': 'Extracting...',
    'session.extractedTitle': 'Extracted Workflow — Edit before saving',
    'session.saveWorkflow': 'Save Workflow',
    'session.saving': 'Saving...',
    'session.noEvents': 'This session has no events',
    'session.showAll': 'Show all ({chars} chars)',
    'session.collapse': 'Collapse',
    'session.detectedTools': 'Detected Tools',

    // Patterns page
    'patterns.title': 'Patterns',
    'patterns.searchPlaceholder': 'Search patterns...',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.totalPatterns': 'Total Patterns',
    'dashboard.totalWorkflows': 'Total Workflows',
    'dashboard.avgConfidence': 'Avg Confidence',
    'dashboard.activePatterns': 'Active Patterns',
  },

  'zh-TW': {
    // Nav
    'nav.dashboard': '儀表板',
    'nav.patterns': '模式',
    'nav.workflows': '工作流程',
    'nav.sessions': '會話',
    'nav.settings': '設定',

    // Common
    'common.save': '儲存',
    'common.cancel': '取消',
    'common.delete': '刪除',
    'common.edit': '編輯',
    'common.confirm': '確認',
    'common.search': '搜尋',
    'common.back': '← 返回',
    'common.steps': '步驟',
    'common.tools': '工具',
    'common.variables': '變數',
    'common.name': '名稱',
    'common.description': '說明',
    'common.required': '必填',
    'common.optional': '選填',
    'common.default': '預設值',
    'common.type': '類型',
    'common.add': '新增',
    'common.remove': '移除',
    'common.prev': '← 上一頁',
    'common.next': '下一頁 →',
    'common.of': '/',
    'common.searching': '搜尋中…',
    'common.semantic': '🧠 語意搜尋',
    'common.keyword': '🔤 關鍵字',

    // Workflows page
    'workflows.title': '工作流程',
    'workflows.count': '{filtered} / {total} 個工作流程',
    'workflows.new': '+ 新增工作流程',
    'workflows.newTitle': '新增工作流程',
    'workflows.searchPlaceholder': '搜尋工作流程（語意 + 關鍵字）…',
    'workflows.namePlaceholder': '工作流程名稱',
    'workflows.descPlaceholder': '這個工作流程做什麼？',
    'workflows.stepPlaceholder': '步驟說明',
    'workflows.addStep': '+ 新增步驟',
    'workflows.addVariable': '+ 新增變數',
    'workflows.create': '建立工作流程',
    'workflows.saveChanges': '儲存變更',
    'workflows.noWorkflows': '尚無工作流程',
    'workflows.noWorkflowsHint': '建立一個來定義可重複使用的步驟序列',
    'workflows.noMatch': '沒有符合「{query}」的工作流程',
    'workflows.noMatchHint': '試試不同的搜尋字詞',
    'workflows.noVariables': '未偵測到變數。新增一個讓此工作流程可重複使用。',
    'workflows.noVariablesShort': '無變數',
    'workflows.varNamePlaceholder': '變數名稱',
    'workflows.varDefaultPlaceholder': '預設值',
    'workflows.varDescPlaceholder': '說明',

    // Session Review
    'session.title': '會話',
    'session.events': '事件',
    'session.extractWorkflow': '擷取工作流程',
    'session.extracting': '擷取中...',
    'session.extractedTitle': '擷取的工作流程 — 儲存前可編輯',
    'session.saveWorkflow': '儲存工作流程',
    'session.saving': '儲存中...',
    'session.noEvents': '此會話沒有事件',
    'session.showAll': '顯示全部（{chars} 字元）',
    'session.collapse': '收合',
    'session.detectedTools': '偵測到的工具',

    // Patterns page
    'patterns.title': '模式',
    'patterns.searchPlaceholder': '搜尋模式…',

    // Dashboard
    'dashboard.title': '儀表板',
    'dashboard.totalPatterns': '總模式數',
    'dashboard.totalWorkflows': '總工作流程數',
    'dashboard.avgConfidence': '平均信心度',
    'dashboard.activePatterns': '活躍模式',
  },

  'zh-CN': {
    // Nav
    'nav.dashboard': '仪表盘',
    'nav.patterns': '模式',
    'nav.workflows': '工作流',
    'nav.sessions': '会话',
    'nav.settings': '设置',

    // Common
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.confirm': '确认',
    'common.search': '搜索',
    'common.back': '← 返回',
    'common.steps': '步骤',
    'common.tools': '工具',
    'common.variables': '变量',
    'common.name': '名称',
    'common.description': '描述',
    'common.required': '必填',
    'common.optional': '可选',
    'common.default': '默认值',
    'common.type': '类型',
    'common.add': '添加',
    'common.remove': '移除',
    'common.prev': '← 上一页',
    'common.next': '下一页 →',
    'common.of': '/',
    'common.searching': '搜索中…',
    'common.semantic': '🧠 语义搜索',
    'common.keyword': '🔤 关键字',

    // Workflows page
    'workflows.title': '工作流',
    'workflows.count': '{filtered} / {total} 个工作流',
    'workflows.new': '+ 新建工作流',
    'workflows.newTitle': '新建工作流',
    'workflows.searchPlaceholder': '搜索工作流（语义 + 关键字）…',
    'workflows.namePlaceholder': '工作流名称',
    'workflows.descPlaceholder': '这个工作流做什么？',
    'workflows.stepPlaceholder': '步骤描述',
    'workflows.addStep': '+ 添加步骤',
    'workflows.addVariable': '+ 添加变量',
    'workflows.create': '创建工作流',
    'workflows.saveChanges': '保存更改',
    'workflows.noWorkflows': '暂无工作流',
    'workflows.noWorkflowsHint': '创建一个来定义可复用的步骤序列',
    'workflows.noMatch': '没有匹配「{query}」的工作流',
    'workflows.noMatchHint': '试试不同的搜索词',
    'workflows.noVariables': '未检测到变量。添加一个让此工作流可复用。',
    'workflows.noVariablesShort': '无变量',
    'workflows.varNamePlaceholder': '变量名',
    'workflows.varDefaultPlaceholder': '默认值',
    'workflows.varDescPlaceholder': '描述',

    // Session Review
    'session.title': '会话',
    'session.events': '事件',
    'session.extractWorkflow': '提取工作流',
    'session.extracting': '提取中...',
    'session.extractedTitle': '提取的工作流 — 保存前可编辑',
    'session.saveWorkflow': '保存工作流',
    'session.saving': '保存中...',
    'session.noEvents': '此会话没有事件',
    'session.showAll': '显示全部（{chars} 字符）',
    'session.collapse': '收起',
    'session.detectedTools': '检测到的工具',

    // Patterns page
    'patterns.title': '模式',
    'patterns.searchPlaceholder': '搜索模式…',

    // Dashboard
    'dashboard.title': '仪表盘',
    'dashboard.totalPatterns': '总模式数',
    'dashboard.totalWorkflows': '总工作流数',
    'dashboard.avgConfidence': '平均置信度',
    'dashboard.activePatterns': '活跃模式',
  },
};

// State
let currentLocale: Locale = (localStorage.getItem('mur-locale') as Locale) || 'en';
let subscribers: Array<() => void> = [];

function notify() {
  subscribers.forEach(fn => fn());
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  localStorage.setItem('mur-locale', locale);
  notify();
}

export function getLocales(): { code: Locale; label: string }[] {
  return [
    { code: 'en', label: 'English' },
    { code: 'zh-TW', label: '繁體中文' },
    { code: 'zh-CN', label: '简体中文' },
  ];
}

export function t(key: string, params?: Record<string, string | number>): string {
  let text = translations[currentLocale]?.[key] || translations.en[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }
  return text;
}

export function subscribe(fn: () => void): () => void {
  subscribers.push(fn);
  return () => {
    subscribers = subscribers.filter(s => s !== fn);
  };
}
