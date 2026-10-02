import { Component, ElementRef, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/** One choice. The value is what the form keeps; the label is what is read. */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * A field that unfolds its choices in place.
 *
 * The rest of the form leans on the platform `<select>`, which is the right
 * control when a list is one answer among many and nothing about it needs
 * drawing. This one is for the choices we want felt: the panel opens under the
 * field, the row under the cursor lifts, the standing answer keeps a tick, and
 * the arrows walk the list the way a native popup does. It is written on the
 * form's own language — the same floating label, the same hairline, the same
 * error line — so a page of these still reads as one form rather than as a
 * widget dropped into it.
 *
 * It implements ControlValueAccessor, so `[(ngModel)]` binds to the host
 * exactly the way it binds to a native control, and the page keeps talking to a
 * plain string.
 */
@Component({
  selector: 'app-select-field',
  templateUrl: './select-field.html',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectField), multi: true },
  ],
  host: {
    // The panel lives in the flow of the page rather than in a layer above it,
    // so a press anywhere else is what has to fold it away.
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
})
export class SelectField implements ControlValueAccessor {
  /** The floating label. */
  readonly label = input.required<string>();
  /** The choices, in the order they are read. */
  readonly options = input.required<SelectOption[]>();
  /** The control id, so the label and the panel point at the field. */
  readonly fieldId = input.required<string>();
  /** Draws the required marker, so the rule is stated in one place. */
  readonly required = input(false);
  /** Paints the error state and reveals the message. */
  readonly error = input(false);
  /** The message under the field when `error` is set. */
  readonly errorText = input('');

  /** The value on screen, mirrored from the form. */
  protected readonly value = signal('');
  /** Whether the panel is unfolded. */
  protected readonly open = signal(false);
  /** The row the keyboard is standing on; -1 when it is on none. */
  protected readonly active = signal(-1);

  private readonly host = inject(ElementRef<HTMLElement>);
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /** What a value reads as, so the trigger never prints a raw key. */
  protected labelFor(value: string): string {
    return this.options().find((option) => option.value === value)?.label ?? '';
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.openPanel();
  }

  private openPanel(): void {
    // Open standing on the answer, if there is one, rather than at the top.
    this.active.set(this.options().findIndex((option) => option.value === this.value()));
    this.open.set(true);
    this.onTouched();
  }

  private close(): void {
    this.open.set(false);
    this.active.set(-1);
  }

  /** Take a value, hand it to the form, and fold the panel away. */
  protected choose(value: string): void {
    this.value.set(value);
    this.onChange(value);
    this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    const options = this.options();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
          return;
        }
        this.active.update((i) => Math.min(i + 1, options.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
          return;
        }
        this.active.update((i) => Math.max(i - 1, 0));
        break;
      case 'Home':
        if (this.open()) {
          event.preventDefault();
          this.active.set(0);
        }
        break;
      case 'End':
        if (this.open()) {
          event.preventDefault();
          this.active.set(options.length - 1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!this.open()) {
          this.openPanel();
        } else if (this.active() >= 0) {
          this.choose(options[this.active()].value);
        } else {
          this.close();
        }
        break;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          this.close();
        }
        break;
      case 'Tab':
        // Moving on lets go of the list, the way a native popup does.
        if (this.open()) this.close();
        break;
    }
  }

  protected onDocumentPointerDown(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  protected onBlur(): void {
    this.onTouched();
  }
}
