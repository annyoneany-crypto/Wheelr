import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WheelConfigurator } from '../../services/wheel-configurator.service';
import { drawWheelCanvas } from '../../shared/extraction-effect/wheel-renderer';
import { WHEEL_TEMPLATES, WheelTemplateItem } from './wheel-templates.data';

@Component({
  selector: 'app-wheel-templates',
  imports: [RouterLink],
  templateUrl: './wheel-templates.html',
  styleUrl: './wheel-templates.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WheelTemplates {
  private readonly wheelConfigurator = inject(WheelConfigurator);
  private readonly router = inject(Router);

  protected readonly templates = WHEEL_TEMPLATES;
  protected readonly copyingTemplateId = signal<string | null>(null);

  private readonly previewCanvases = viewChildren<ElementRef<HTMLCanvasElement>>('previewCanvas');

  constructor() {
    afterNextRender(() => this.drawPreviews());
  }

  private drawPreviews(): void {
    this.previewCanvases().forEach((canvasRef, index) => {
      const template = this.templates[index];
      if (!template) {
        return;
      }

      const canvas = canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      drawWheelCanvas(canvas, ctx, {
        names: template.names,
        colors: template.palette.colors,
        fontFamily: '"Inter", sans-serif',
        radiusInset: 6,
      });
    });
  }

  protected async copyTemplate(template: WheelTemplateItem): Promise<void> {
    if (this.copyingTemplateId()) {
      return;
    }

    this.copyingTemplateId.set(template.id);
    try {
      await this.wheelConfigurator.createWheelWorkspaceFromTemplate(template);
      await this.router.navigate(['/']);
    } finally {
      this.copyingTemplateId.set(null);
    }
  }
}
