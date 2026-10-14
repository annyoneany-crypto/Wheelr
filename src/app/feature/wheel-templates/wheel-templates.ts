import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChildren,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WheelConfigurator } from '../../services/wheel-configurator.service';
import { drawWheelCanvas } from '../../shared/extraction-effect/wheel-renderer';
import { WHEEL_TEMPLATES, WheelTemplateItem } from './wheel-templates.data';
import { templateLandingPath } from './wheel-templates.seo';
import { templateLabels } from './template-labels';

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

  protected readonly labels = templateLabels;

  /** What the visitor typed in the search box. */
  protected readonly query = signal('');

  /**
   * Templates whose name contains the query, ignoring case and accents, so
   * "caffe" finds "Caffè" in the Italian bundle. Names are already localized.
   */
  protected readonly templates = computed(() => {
    const needle = normalizeForSearch(this.query());
    return needle
      ? WHEEL_TEMPLATES.filter((template) => normalizeForSearch(template.name).includes(needle))
      : WHEEL_TEMPLATES;
  });

  /** `/templates/<slug>` for a card, so the list links into every landing page. */
  protected readonly landingPath = templateLandingPath;
  protected readonly copyingTemplateId = signal<string | null>(null);

  private readonly previewCanvases = viewChildren<ElementRef<HTMLCanvasElement>>('previewCanvas');

  constructor() {
    // Cards come and go as the search changes, so the previews are redrawn on
    // every change rather than once. afterRenderEffect never runs while
    // prerendering, where there is no canvas to draw on.
    afterRenderEffect(() => this.drawPreviews(this.previewCanvases()));
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  private drawPreviews(canvases: readonly ElementRef<HTMLCanvasElement>[]): void {
    canvases.forEach((canvasRef) => {
      const id = canvasRef.nativeElement.dataset['templateId'];
      const template = WHEEL_TEMPLATES.find((item) => item.id === id);
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
        gradientTo: template.palette.gradientTo,
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

function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
