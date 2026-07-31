import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { WheelConfigurator } from '../../services/wheel-configurator.service';

@Component({
  selector: 'wl-create-wheel',
  imports: [ReactiveFormsModule],
  templateUrl: './create-wheel.html',
  styleUrl: './create-wheel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WlCreateWheel {
  private readonly formBuilder = inject(FormBuilder);
  private readonly wheelConfigurator = inject(WheelConfigurator);

  readonly isOpen = input(false);
  readonly closeRequested = output<void>();
  readonly created = output<void>();

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  isCreating = signal(false);
  createError = signal('');

  createForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(60)]],
    description: ['', [Validators.maxLength(160)]],
  });

  constructor() {
    effect(() => {
      if (!this.isOpen()) {
        return;
      }

      this.nameInput()?.nativeElement.focus();
    });
  }

  closeModal(): void {
    if (this.isCreating()) {
      return;
    }

    this.resetForm();
    this.closeRequested.emit();
  }

  async submit(): Promise<void> {
    if (this.isCreating()) {
      return;
    }

    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      this.createError.set('Enter a name for the wheel.');
      return;
    }

    this.isCreating.set(true);
    this.createError.set('');

    try {
      const { name, description } = this.createForm.getRawValue();
      await this.wheelConfigurator.createWheelWorkspace(name, description);
      this.wheelConfigurator.setVisibleWheelCount(1);

      this.isCreating.set(false);
      this.resetForm();
      this.created.emit();
      this.closeRequested.emit();
    } catch {
      this.isCreating.set(false);
      this.createError.set('Could not create the wheel. Try again.');
    }
  }

  private resetForm(): void {
    this.createForm.reset({ name: '', description: '' });
    this.createError.set('');
  }
}
