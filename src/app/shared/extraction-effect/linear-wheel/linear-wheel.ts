import { Component, ElementRef, HostListener, inject, model, signal, viewChild } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';

@Component({
  selector: 'wl-linear-wheel',
  imports: [],
  templateUrl: './linear-wheel.html',
  styleUrl: './linear-wheel.css',
})
export class LinearWheel {
  wheelConfigurator = inject(WheelConfigurator);

  // Riferimento al canvas HTML
  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  // Variabili per il Canvas e l'animazione
  private ctx!: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private itemWidth = 200; // Larghezza di ogni "box" nome
  private offset = 0; // Posizione attuale dello scroll (pixel)
  private velocity = 0; // Velocità corrente
  private isDecelerating = false; // Se stiamo frenando
 
  // Colori per i box (ciclici)
  private colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];


  ngAfterViewInit() {
    this.initCanvas();
    // Disegna il primo frame
    requestAnimationFrame(() => this.draw());
  }


  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }


  // Aggiusta il canvas per schermi ad alta densità e inizializza il contesto
  private initCanvas() {
    const canvas = this.canvasRef()!.nativeElement;
    this.ctx = canvas.getContext('2d')!;
   
    // Gestione High DPI (Retina displays)
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
   
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
   
    this.ctx.scale(dpr, dpr);
   
    // Impostazioni font base
    this.ctx.font = 'bold 24px "Inter", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
  }


  // Logica principale del loop di disegno
  private draw() {
    if (!this.ctx) return;
   
    const canvas = this.canvasRef()!.nativeElement;
    // Usiamo le dimensioni CSS effettive per i calcoli logici
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
   
    // 1. Pulisci il canvas
    this.ctx.clearRect(0, 0, width, height);


    const list = this.wheelConfigurator.names();
    if (list.length === 0) return;


    // 2. Aggiorna la fisica se in movimento
    if (this.wheelConfigurator.isSpinning()) {
      this.offset += this.velocity;
     
      // Logica di decelerazione
      if (this.isDecelerating) {
        this.velocity *= 0.985; // Attrito (più basso = frena più lento)
       
        // Stop quando è molto lento
        if (this.velocity < 0.1) {
          this.velocity = 0;
          this.wheelConfigurator.isSpinning.set(false);
          this.isDecelerating = false;
          this.snapToNearest(); // Allinea perfettamente al centro
        }
      }
    }


    // 3. Logica "Infinite Scroll" usando il modulo
   
    // Il centro del canvas (dove sta la freccia)
    const centerX = width / 2;


    // Troviamo l'indice "virtuale" centrale basato sull'offset assoluto
    // (offset / itemWidth) ci dice esattamente quale numero di item (es. il 50esimo) dovrebbe essere al centro
    const currentVirtualIndex = Math.floor(this.offset / this.itemWidth);
   
    // Calcoliamo quanti elementi disegnare a destra e sinistra per coprire lo schermo
    // Aggiungiamo +2 di buffer per sicurezza
    const halfVisible = Math.ceil((width / this.itemWidth) / 2) + 2;


    // Disegniamo solo gli elementi visibili
    for (let i = currentVirtualIndex - halfVisible; i <= currentVirtualIndex + halfVisible; i++) {
      // Indice circolare per recuperare il nome dall'array (gestisce il loop infinito)
      let index = ((i % list.length) + list.length) % list.length;
     
      // Calcolo posizione X
      // (i * itemWidth): posizione assoluta teorica dell'elemento nella striscia infinita
      // - this.offset: quanto abbiamo scollato
      // + centerX: sposta l'origine al centro dello schermo
      // - (this.itemWidth / 2): centra il box rispetto al proprio punto centrale
      let renderX = (i * this.itemWidth) - this.offset + centerX - (this.itemWidth / 2);


      // Disegna il Box
      this.ctx.fillStyle = this.colors[index % this.colors.length];
     
      // Effetto visivo: Evidenzia leggermente quello che passa sotto il centro
      const distFromCenter = Math.abs((renderX + this.itemWidth/2) - centerX);
      const isCenter = distFromCenter < (this.itemWidth / 2);
     
      if (isCenter) {
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      } else {
        this.ctx.shadowBlur = 0;
      }


      // Disegna rettangolo arrotondato (simulato)
      const padding = 5;
      this.ctx.fillRect(renderX + padding, 10, this.itemWidth - (padding*2), height - 20);
     
      // Disegna il bordo
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(renderX + padding, 10, this.itemWidth - (padding*2), height - 20);


      // Disegna il Testo
      this.ctx.fillStyle = 'white';
      this.ctx.shadowBlur = 4;
      this.ctx.shadowColor = 'black';
     
      // Troncamento testo se troppo lungo
      const text = list[index];
      const maxTextWidth = this.itemWidth - 20;
      let textToDraw = text;
      if (this.ctx.measureText(text).width > maxTextWidth) {
         textToDraw = text.substring(0, 10) + '..';
      }
     
      this.ctx.fillText(textToDraw, renderX + (this.itemWidth / 2), height / 2);
     
      // Reset shadow
      this.ctx.shadowBlur = 0;
    }


    // Richiedi il prossimo frame
    this.animationId = requestAnimationFrame(() => this.draw());
  }


  // Funzione per avviare la rotazione
  spin() {
    if (this.wheelConfigurator.isSpinning() || this.wheelConfigurator.names().length < 2) return;
   
    this.wheelConfigurator.winner.set(null);
    this.wheelConfigurator.isSpinning.set(true);
    this.isDecelerating = false;
   
    // Velocità iniziale molto alta
    this.velocity = 50 + Math.random() * 20;
   
    // Inizia a frenare dopo un tempo casuale (es. 2 secondi)
    setTimeout(() => {
      this.isDecelerating = true;
    }, 1000 + Math.random() * 1000);
  }


  // Allinea l'elemento più vicino al centro quando la ruota si ferma
  private snapToNearest() {
    // Calcoliamo quale indice è al centro
    const totalWidth = this.wheelConfigurator.names().length * this.itemWidth;
   
    // Offset normalizzato positivo
    let currentPos = this.offset % totalWidth;
    if (currentPos < 0) currentPos += totalWidth;
   
    // L'indice vincente è quello che "copre" il punto di offset corrente
    // (Arrotondiamo per trovare il "box" più vicino)
    const winningIndex = Math.round(currentPos / this.itemWidth) % this.wheelConfigurator.names().length;
   
    // Calcoliamo l'offset esatto per centrare quel box
    const targetOffset = winningIndex * this.itemWidth;
   
    // Piccolo scatto visivo per allineare perfettamente (opzionale, ma pulito)
    // Qui aggiorniamo this.offset per far sì che il rendering successivo sia centrato
    // Nota: manteniamo i "giri" totali fatti finora per non saltare visivamente
    const rounds = Math.floor(this.offset / totalWidth);
    this.offset = (rounds * totalWidth) + targetOffset;


    // Determina il vincitore
    const winnerName = this.wheelConfigurator.names()[winningIndex];
    this.wheelConfigurator.winner.set(winnerName);
  }

  // Listener per ridimensionamento finestra
  @HostListener('window:resize')
  onResize() {
    this.initCanvas();
  }
}
