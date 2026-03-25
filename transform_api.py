#!/usr/bin/env python3
"""Transform api.ts: add ApiError class and update error handling."""

import re

with open('src/lib/api.ts', 'r') as f:
    content = f.read()

# 1. Add ApiError class export right after the imports (before `let dataSource`)
api_error_class = '''
// --- ApiError ---

export type ApiErrorKind = 'network' | 'auth' | 'not_found' | 'server' | 'validation' | 'unknown';

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly endpoint: string;

  constructor(message: string, status: number, kind: ApiErrorKind, endpoint: string = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.endpoint = endpoint;
  }

  /** True for 5xx or network errors — caller may want to retry. */
  get retryable(): boolean {
    return this.kind === 'network' || this.kind === 'server';
  }

  static fromStatus(status: number, message: string, endpoint: string = ''): ApiError {
    let kind: ApiErrorKind;
    if (status === 401 || status === 403) kind = 'auth';
    else if (status === 404) kind = 'not_found';
    else if (status === 422 || status === 400) kind = 'validation';
    else if (status >= 500) kind = 'server';
    else kind = 'unknown';
    return new ApiError(message, status, kind, endpoint);
  }

  static network(message: string, endpoint: string = ''): ApiError {
    return new ApiError(message, 0, 'network', endpoint);
  }
}

'''

content = content.replace(
    "\nlet dataSource: DataSource = 'demo';",
    api_error_class + "let dataSource: DataSource = 'demo';",
    1
)

# 2. Update parseErrorResponse to return ApiError instead of string
old_parse = '''async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.error) return body.error;
    if (body?.message) return body.message;
  } catch { /* ignore parse errors */ }
  return `API error: ${res.status} ${res.statusText}`;
}'''

new_parse = '''async function parseErrorResponse(res: Response, endpoint: string = ''): Promise<ApiError> {
  let message = `API error: ${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
    else if (body?.message) message = body.message;
  } catch { /* ignore parse errors */ }
  return ApiError.fromStatus(res.status, message, endpoint);
}'''

content = content.replace(old_parse, new_parse)

# 3. Update apiGet
old_apiGet = '''async function apiGet<T>(path: string): Promise<T> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, { headers: authHeaders() });
  } catch (e) {
    throw new Error(`Network error: server may be offline`);
  }
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}'''

new_apiGet = '''async function apiGet<T>(path: string): Promise<T> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  const endpoint = `GET ${path}`;
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, { headers: authHeaders() });
  } catch (e) {
    throw ApiError.network('Network error: server may be offline', endpoint);
  }
  if (!res.ok) throw await parseErrorResponse(res, endpoint);
  return res.json();
}'''

content = content.replace(old_apiGet, new_apiGet)

# 4. Update apiPost
old_apiPost = '''async function apiPost<T>(path: string, body: unknown): Promise<T> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Network error: server may be offline`);
  }
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}'''

new_apiPost = '''async function apiPost<T>(path: string, body: unknown): Promise<T> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  const endpoint = `POST ${path}`;
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw ApiError.network('Network error: server may be offline', endpoint);
  }
  if (!res.ok) throw await parseErrorResponse(res, endpoint);
  return res.json();
}'''

content = content.replace(old_apiPost, new_apiPost)

# 5. Update apiPut
old_apiPut = '''async function apiPut<T>(path: string, body: unknown): Promise<T> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Network error: server may be offline`);
  }
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}'''

new_apiPut = '''async function apiPut<T>(path: string, body: unknown): Promise<T> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  const endpoint = `PUT ${path}`;
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw ApiError.network('Network error: server may be offline', endpoint);
  }
  if (!res.ok) throw await parseErrorResponse(res, endpoint);
  return res.json();
}'''

content = content.replace(old_apiPut, new_apiPut)

# 6. Update apiDelete
old_apiDelete = '''async function apiDelete(path: string): Promise<void> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, { method: 'DELETE', headers: authHeaders() });
  } catch (e) {
    throw new Error(`Network error: server may be offline`);
  }
  if (!res.ok) throw new Error(await parseErrorResponse(res));
}'''

new_apiDelete = '''async function apiDelete(path: string): Promise<void> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  const endpoint = `DELETE ${path}`;
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, { method: 'DELETE', headers: authHeaders() });
  } catch (e) {
    throw ApiError.network('Network error: server may be offline', endpoint);
  }
  if (!res.ok) throw await parseErrorResponse(res, endpoint);
}'''

content = content.replace(old_apiDelete, new_apiDelete)

# 7. Update apiPatch
old_apiPatch = '''async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Network error: server may be offline`);
  }
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}'''

new_apiPatch = '''async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  await ensureBackend();
  if (dataSource === 'demo') throw new Error('demo mode');
  const endpoint = `PATCH ${path}`;
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${apiPath(path)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw ApiError.network('Network error: server may be offline', endpoint);
  }
  if (!res.ok) throw await parseErrorResponse(res, endpoint);
  return res.json();
}'''

content = content.replace(old_apiPatch, new_apiPatch)

with open('src/lib/api.ts', 'w') as f:
    f.write(content)

print("✅ Transform complete")

# Verify
with open('src/lib/api.ts', 'r') as f:
    new_content = f.read()

checks = [
    ('ApiError class', 'export class ApiError extends Error' in new_content),
    ('ApiErrorKind type', "export type ApiErrorKind" in new_content),
    ('fromStatus', 'static fromStatus' in new_content),
    ('network factory', 'static network' in new_content),
    ('parseErrorResponse updated', "endpoint: string = ''" in new_content),
    ('apiGet updated', "ApiError.network('Network error: server may be offline', endpoint)" in new_content),
    ('No old-style throws remain in core methods', "throw new Error(`Network error:" not in new_content),
    ('No old-style parseErrorResponse calls', "throw new Error(await parseErrorResponse(res))" not in new_content),
]

all_ok = True
for name, ok in checks:
    status = '✅' if ok else '❌'
    print(f"  {status} {name}")
    if not ok:
        all_ok = False

if not all_ok:
    print("\n⚠️  Some checks failed!")
else:
    print("\n✅ All checks passed!")

lines = new_content.count('\n') + 1
print(f"   File: {lines} lines")
