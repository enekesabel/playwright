/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import '@web/common.css';
import { applyTheme } from '@web/theme';
import '@web/third_party/vscode/codicon.css';
import * as ReactDOM from 'react-dom/client';
import { Recorder } from './recorder';

(async () => {
  const searchParams = new URLSearchParams(window.location.search);
  const wsGuid = searchParams.get('ws');
  if (wsGuid)
    setupWebSocketTransport(wsGuid);
  applyTheme();
  ReactDOM.createRoot(document.querySelector('#root')!).render(<Recorder/>);
})();

function setupWebSocketTransport(wsGuid: string) {
  const wsURL = new URL(`../${wsGuid}`, window.location.toString());
  wsURL.protocol = (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
  const ws = new WebSocket(wsURL);
  let lastId = 0;
  const callbacks = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  const connected = new Promise<void>((resolve, reject) => {
    ws.addEventListener('open', () => resolve());
    ws.addEventListener('error', () => reject(new Error('Recorder WebSocket error')));
  });

  ws.addEventListener('message', event => {
    const { id, result, error, method, params } = JSON.parse(event.data.toString());
    if (id) {
      const callback = callbacks.get(id);
      if (!callback)
        return;
      callbacks.delete(id);
      if (error)
        callback.reject(new Error(error));
      else
        callback.resolve(result);
      return;
    }
    if (method && typeof window.dispatch === 'function')
      window.dispatch({ method, params });
  });

  ws.addEventListener('close', () => {
    for (const callback of callbacks.values())
      callback.reject(new Error('Recorder connection closed'));
    callbacks.clear();
  });

  window.sendCommand = async (data: { method: string; params?: any }) => {
    await connected;
    const id = ++lastId;
    ws.send(JSON.stringify({ id, ...data }));
    return await new Promise((resolve, reject) => {
      callbacks.set(id, { resolve, reject });
    });
  };
}
