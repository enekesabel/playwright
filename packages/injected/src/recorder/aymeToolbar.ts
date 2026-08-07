/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { UIState } from '@recorder/recorderTypes';
import type { Recorder } from './recorder';
import type { RecorderToolbarView, ToolbarSucceededTool } from './toolbarView';

export class AymeToolbar implements RecorderToolbarView {
  private readonly _root: HTMLElement;
  private readonly _style: HTMLStyleElement;
  private readonly _recordButton: HTMLButtonElement;
  private readonly _assertVisibilityButton: HTMLButtonElement;
  private _succeededTimer: number | undefined;

  constructor(private readonly _recorder: Recorder) {
    const document = _recorder.document;
    this._style = document.createElement('style');
    this._style.textContent = aymeToolbarCSS;

    this._root = document.createElement('x-pw-ayme-toolbar');
    this._root.setAttribute('role', 'toolbar');
    this._root.setAttribute('aria-label', 'Ayme recorder controls');

    this._recordButton = this._createButton('record', 'Start Recording', createRecordIcon);
    this._recordButton.addEventListener('click', () => {
      const mode = this._recorder.state.mode;
      this._recorder.setMode(mode === 'none' || mode === 'standby' || mode === 'inspecting' ? 'recording' : 'standby');
    });

    this._assertVisibilityButton = this._createButton('assert-visibility', 'Assert visibility', createVisibilityIcon);
    this._assertVisibilityButton.addEventListener('click', () => {
      if (!this._assertVisibilityButton.disabled)
        this._recorder.setMode(this._recorder.state.mode === 'assertingVisibility' ? 'recording' : 'assertingVisibility');
    });

    this._root.append(this._recordButton, this._assertVisibilityButton);
  }

  install() {
    this._recorder.highlight.appendChild(this._style);
    this._recorder.highlight.appendChild(this._root);
  }

  setUIState(state: UIState) {
    const isRecording = state.mode === 'recording' || state.mode === 'assertingText' || state.mode === 'assertingVisibility' || state.mode === 'assertingValue' || state.mode === 'assertingSnapshot' || state.mode === 'recording-inspecting';
    this._root.dataset.theme = state.toolbarTheme;
    this._recordButton.classList.toggle('toggled', isRecording);
    this._recordButton.title = isRecording ? 'Stop Recording' : 'Start Recording';
    this._recordButton.setAttribute('aria-label', this._recordButton.title);
    this._recordButton.setAttribute('aria-pressed', String(isRecording));
    this._assertVisibilityButton.classList.toggle('toggled', state.mode === 'assertingVisibility');
    this._assertVisibilityButton.disabled = state.mode === 'none' || state.mode === 'standby' || state.mode === 'inspecting';
    this._assertVisibilityButton.setAttribute('aria-pressed', String(state.mode === 'assertingVisibility'));
    this._root.toggleAttribute('hidden', state.mode === 'none');
  }

  flashToolSucceeded(tool: ToolbarSucceededTool) {
    if (tool !== 'assertingVisibility')
      return;
    if (this._succeededTimer)
      this._recorder.injectedScript.utils.builtins.clearTimeout(this._succeededTimer);
    this._assertVisibilityButton.classList.add('succeeded');
    this._succeededTimer = this._recorder.injectedScript.utils.builtins.setTimeout(() => {
      this._assertVisibilityButton.classList.remove('succeeded');
      this._succeededTimer = undefined;
    }, 2000);
  }

  private _createButton(action: string, title: string, createIcon: (document: Document) => SVGElement) {
    const button = this._recorder.document.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.title = title;
    button.setAttribute('aria-label', title);
    button.setAttribute('aria-pressed', 'false');
    button.appendChild(createIcon(this._recorder.document));
    return button;
  }
}

function createRecordIcon(document: Document) {
  const svg = createSvgElement(document, 'svg', { 'viewBox': '0 0 16 16', 'aria-hidden': 'true' });
  svg.append(
      createSvgElement(document, 'circle', { cx: '8', cy: '8', r: '4' }),
      createSvgElement(document, 'path', { class: 'stop', d: 'M4.5 4.5h7v7h-7z' }),
  );
  return svg;
}

function createVisibilityIcon(document: Document) {
  const svg = createSvgElement(document, 'svg', { 'viewBox': '0 0 16 16', 'aria-hidden': 'true' });
  svg.appendChild(createSvgElement(document, 'path', { d: 'M8 3c3.2 0 5.8 2 7 5-1.2 3-3.8 5-7 5S2.2 11 1 8c1.2-3 3.8-5 7-5Zm0 1.5A3.5 3.5 0 1 0 8 11.5 3.5 3.5 0 0 0 8 4.5Zm0 1.6A1.9 1.9 0 1 1 8 9.9 1.9 1.9 0 0 1 8 6.1Z' }));
  return svg;
}

function createSvgElement(document: Document, tagName: string, attributes: Record<string, string>) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);
  for (const [name, value] of Object.entries(attributes))
    element.setAttribute(name, value);
  return element;
}

const aymeToolbarCSS = `
x-pw-ayme-toolbar {
  --ayme-toolbar-background: rgb(250 250 252 / 78%);
  --ayme-toolbar-border: rgb(24 24 27 / 12%);
  --ayme-toolbar-foreground: #27272a;
  --ayme-toolbar-hover: rgb(24 24 27 / 8%);
  --ayme-toolbar-active: rgb(37 99 235 / 16%);
  --ayme-toolbar-active-foreground: #1d4ed8;
  align-items: center;
  backdrop-filter: blur(18px) saturate(145%);
  background: var(--ayme-toolbar-background);
  border: 1px solid var(--ayme-toolbar-border);
  border-radius: 999px;
  box-shadow: 0 8px 28px rgb(0 0 0 / 16%);
  display: flex;
  gap: 4px;
  left: 50%;
  padding: 5px;
  pointer-events: auto;
  position: absolute;
  top: 12px;
  transform: translateX(-50%);
  z-index: 2147483647;
}

x-pw-ayme-toolbar[data-theme=dark] {
  --ayme-toolbar-background: rgb(39 39 42 / 82%);
  --ayme-toolbar-border: rgb(255 255 255 / 14%);
  --ayme-toolbar-foreground: #f4f4f5;
  --ayme-toolbar-hover: rgb(255 255 255 / 10%);
  --ayme-toolbar-active: rgb(96 165 250 / 22%);
  --ayme-toolbar-active-foreground: #bfdbfe;
  color-scheme: dark;
}

x-pw-ayme-toolbar[hidden] {
  display: none;
}

x-pw-ayme-toolbar button {
  align-items: center;
  appearance: none;
  background: transparent;
  border: 0;
  border-radius: 999px;
  color: var(--ayme-toolbar-foreground);
  cursor: pointer;
  display: inline-flex;
  height: 32px;
  justify-content: center;
  margin: 0;
  padding: 0;
  width: 32px;
}

x-pw-ayme-toolbar button:hover {
  background: var(--ayme-toolbar-hover);
}

x-pw-ayme-toolbar button:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 1px;
}

x-pw-ayme-toolbar button.toggled {
  background: var(--ayme-toolbar-active);
  color: var(--ayme-toolbar-active-foreground);
}

x-pw-ayme-toolbar button:disabled {
  cursor: default;
  opacity: .42;
}

x-pw-ayme-toolbar button.succeeded {
  background: rgb(34 197 94 / 20%);
  color: #16a34a;
}

x-pw-ayme-toolbar svg {
  fill: currentColor;
  height: 16px;
  width: 16px;
}

x-pw-ayme-toolbar button[data-action=record] .stop {
  display: none;
}

x-pw-ayme-toolbar button[data-action=record].toggled circle {
  display: none;
}

x-pw-ayme-toolbar button[data-action=record].toggled .stop {
  display: block;
}
`;
