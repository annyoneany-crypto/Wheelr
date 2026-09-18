/**
 * Accessible labels that embed a template's name. They were concatenated in the
 * templates (`'Copy the ' + name + ' wheel'`), which `ng extract-i18n` cannot see
 * and which no language other than English can reorder, so they live here as
 * `$localize` messages with a `NAME` placeholder instead.
 */
export const templateLabels = {
  entryCount: (count: number) => $localize`:@@templates.entryCount:${count}:COUNT: entries on this wheel`,
  preview: (name: string) => $localize`:@@templates.previewAria:Preview of the ${name}:NAME: wheel`,
  copyAndOpen: (name: string) =>
    $localize`:@@templates.copyAria:Copy the ${name}:NAME: wheel to your wheels and open it`,
  readMore: (name: string) => $localize`:@@templates.readMoreAria:Read about the ${name}:NAME: wheel and try it`,
  wheel: (name: string) => $localize`:@@landing.wheelAria:The ${name}:NAME: wheel`,
  spin: (name: string) => $localize`:@@landing.spinAria:Spin the ${name}:NAME: wheel`,
  copyLanding: (name: string) => $localize`:@@landing.copyAria:Copy the ${name}:NAME: wheel and open it`,
};
