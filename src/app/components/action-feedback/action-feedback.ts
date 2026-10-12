import { Component, Injectable, inject, signal } from '@angular/core';

export type ActionFeedbackKind = 'loading' | 'success' | 'error';

export interface ActionFeedbackNotice {
  id: number;
  kind: ActionFeedbackKind;
  title: string;
  detail: string;
}

@Injectable({ providedIn: 'root' })
export class ActionFeedbackService {
  readonly notice = signal<ActionFeedbackNotice | null>(null);
  private sequence = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  begin(title: string, detail = 'Please wait while we finish this action.'): number {
    const id = ++this.sequence;
    clearTimeout(this.timer);
    this.notice.set({ id, kind: 'loading', title, detail });
    return id;
  }

  complete(id: number, kind: 'success' | 'error', title: string, detail: string): void {
    if (this.notice()?.id !== id) return;
    this.show({ id, kind, title, detail });
  }

  success(title: string, detail: string): void {
    this.show({ id: ++this.sequence, kind: 'success', title, detail });
  }

  error(title: string, detail: string): void {
    this.show({ id: ++this.sequence, kind: 'error', title, detail });
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.notice.set(null);
  }

  private show(notice: ActionFeedbackNotice): void {
    clearTimeout(this.timer);
    this.notice.set(notice);
    this.timer = setTimeout(() => {
      if (this.notice()?.id === notice.id) this.notice.set(null);
    }, 3800);
  }
}

@Component({
  selector: 'app-action-feedback',
  template: `
    @if (feedback.notice(); as notice) {
      <div class="action-feedback" [class]="'action-feedback action-feedback--' + notice.kind" [attr.role]="notice.kind === 'error' ? 'alert' : 'status'" aria-live="polite">
        <span class="feedback-mark" aria-hidden="true">
          @if (notice.kind === 'loading') {
            <span class="feedback-spinner"></span>
          } @else if (notice.kind === 'success') {
            <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
          } @else {
            <svg viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17" /></svg>
          }
        </span>
        <span class="feedback-copy"><strong>{{ notice.title }}</strong><small>{{ notice.detail }}</small></span>
        @if (notice.kind !== 'loading') {
          <button type="button" aria-label="Dismiss notification" (click)="dismiss()">×</button>
        }
      </div>
    }
  `,
  styles: [`
    :host{position:fixed;right:20px;bottom:20px;z-index:1600;pointer-events:none}
    .action-feedback{display:flex;align-items:center;gap:11px;width:min(390px,calc(100vw - 32px));padding:13px 14px;border:1px solid var(--line);border-radius:8px;background:var(--white);color:var(--ink);box-shadow:0 14px 44px rgba(15,18,20,.18);pointer-events:auto;animation:feedback-in .24s cubic-bezier(.22,.61,.36,1) both}
    .feedback-mark{display:grid;place-items:center;width:31px;height:31px;flex:none;border-radius:50%;background:var(--paper);color:var(--ink-60)}
    .feedback-mark svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .action-feedback--success .feedback-mark{background:var(--verify-tint);color:var(--verify)}
    .action-feedback--error .feedback-mark{background:rgba(163,41,41,.09);color:#a32929}
    .feedback-copy{display:grid;gap:3px;min-width:0;flex:1}
    .feedback-copy strong{font-family:var(--font-d);font-size:.79rem;font-weight:700}
    .feedback-copy small{color:var(--ink-60);font-size:.71rem;line-height:1.35}
    .action-feedback>button{width:28px;height:28px;flex:none;border:0;border-radius:50%;background:transparent;color:var(--ink-40);font-size:20px;line-height:1;cursor:pointer}
    .action-feedback>button:hover{background:var(--paper);color:var(--ink)}
    .feedback-spinner{width:16px;height:16px;border:2px solid var(--line);border-top-color:var(--orange-deep);border-radius:50%;animation:feedback-spin .72s linear infinite}
    @keyframes feedback-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes feedback-spin{to{transform:rotate(360deg)}}
    @media(max-width:600px){:host{right:12px;bottom:12px;left:12px}.action-feedback{width:100%}}
    @media(prefers-reduced-motion:reduce){.action-feedback{animation:none}.feedback-spinner{animation-duration:2s}}
  `],
})
export class ActionFeedback {
  protected readonly feedback = inject(ActionFeedbackService);

  protected dismiss(): void {
    this.feedback.dismiss();
  }
}
