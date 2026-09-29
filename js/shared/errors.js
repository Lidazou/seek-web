/*
 * Seek 前端 · 错误类型
 * ---------------------------------------------------------------------------
 * 统一用「错误类别 kind」判断处理方式，不要靠解析后端返回的中文/英文文案。
 *
 * 后端未来建议返回稳定的机器码，前端按码映射：
 *   INVALID_QUERY / MODEL_UNAVAILABLE / INDEX_NOT_READY / SERVICE_BUSY /
 *   NO_DATA / INTERNAL_ERROR
 *
 * 兼容说明：页面历史上一直用 SearchFailure(kind, message)，
 * 这里保留它作为基类行为，同时提供语义化的子类，
 * 这样旧 throw 不用改，新代码可以直接用具体类型。
 */

/* 错误类别 → UI 文案标题（search-view 使用） */
export const ERROR_TITLES = {
  unconnected: '搜索服务尚未连接',
  network: '连接暂时中断',
  timeout: '搜索等待超时',
  model: '模型暂时无法完成搜索',
  request: '搜索请求未被接受',
  service: '搜索服务暂时不可用',
  invalid_response: '搜索服务返回的数据无法识别',
  busy: '搜索服务正在忙',
  index_not_ready: '索引还没准备好'
};

export class SearchError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'SearchError';
    this.kind = kind;
  }
}

/* 兼容旧名字：整个页面历史代码都 throw new SearchFailure(kind, message) */
export class SearchFailure extends SearchError {
  constructor(kind, message) {
    super(kind, message);
    this.name = 'SearchFailure';
  }
}

export class NetworkError extends SearchFailure {
  constructor(message = '无法连接搜索服务，请检查网络、接口地址与跨域设置。') { super('network', message); }
}

export class TimeoutError extends SearchFailure {
  constructor(message = '搜索等待超时。记忆已保留，可以重试。') { super('timeout', message); }
}

export class ApiError extends SearchFailure {
  constructor(message = '搜索请求未被接受。') { super('request', message); }
}

export class ModelUnavailableError extends SearchFailure {
  constructor(message = '搜索模型暂时无法完成检索，请稍后重试。') { super('model', message); }
}

export class IndexNotReadyError extends SearchFailure {
  constructor(message = '搜索索引还没准备好，请稍后再试。') { super('index_not_ready', message); }
}

export class ServiceBusyError extends SearchFailure {
  constructor(message = '搜索服务正在忙，请稍后再试。') { super('busy', message); }
}

export class InvalidResponseError extends SearchFailure {
  constructor(message = '搜索服务返回的数据无法识别。') { super('invalid_response', message); }
}

export class CoverLoadError extends SearchFailure {
  constructor(message = '封面无法加载。') { super('service', message); }
}

/* 未连接服务（用户还没配置任何后端，也没有开启 Demo） */
export class UnconnectedError extends SearchFailure {
  constructor(message = '尚未连接搜索服务。你的记忆已保留，可以连接接口，或使用明确标注的示例演示。') {
    super('unconnected', message);
  }
}
