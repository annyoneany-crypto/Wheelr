import { Component, ElementRef, HostListener, inject, model, signal, viewChild } from '@angular/core';
import { WheelConfigurator } from '../../../services/wheel-configurator.service';

@Component({
  selector: 'wl-linear-wheel',
  imports: [],
  templateUrl: './linear-wheel.html',
  styleUrl: './linear-wheel.css',
  host: {
    class: 'w-full',
  }
})
export class LinearWheel {
  wheelConfigurator = inject(WheelConfigurator);

  // Reference to the canvas HTML
  canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  // Variables for Canvas and animation
  private ctx!: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private itemWidth = 200; // Width of each name "box"
  private offset = 0; // Current scroll position (pixels)
  private velocity = 0; // Current velocity
  private isDecelerating = false; // Whether we are braking
 
  // Colors for boxes (cyclic)
  private colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981'];


  ngAfterViewInit() {
    this.initCanvas();
    // Draw the first frame
    requestAnimationFrame(() => this.draw());
  }


  ngOnDestroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }


  // Adjust canvas for high-density screens and initialize context
  private initCanvas() {
    const canvas = this.canvasRef()!.nativeElement;
    this.ctx = canvas.getContext('2d')!;
   
    // High DPI (Retina displays) handling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
   
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
   
    this.ctx.scale(dpr, dpr);
   
    // Base font settings
    this.ctx.font = 'bold 24px "Inter", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
  }


  // Main drawing loop logic
  private draw() {
    if (!this.ctx) return;
   
    const canvas = this.canvasRef()!.nativeElement;
    // Use actual CSS dimensions for logical calculations
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
   
    // 1. Clear the canvas
    this.ctx.clearRect(0, 0, width, height);


    const list = this.wheelConfigurator.names();
    if (list.length === 0) return;


    // 2. Update physics if moving
    if (this.wheelConfigurator.isSpinning()) {
      this.offset += this.velocity;
     
      // Deceleration logic
      if (this.isDecelerating) {
        this.velocity *= 0.985; // Friction (lower = slower braking)
       
        // Stop when very slow
        if (this.velocity < 0.1) {
          this.velocity = 0;
          this.wheelConfigurator.isSpinning.set(false);
          this.isDecelerating = false;
          this.snapToNearest(); // Align perfectly to center
        }
      }
    }


    // 3. "Infinite Scroll" logic using modulo
   
    // The center of the canvas (where the arrow is)
    const centerX = width / 2;


    // Find the central "virtual" index based on absolute offset
    // (offset / itemWidth) tells us exactly which item number (e.g., the 50th) should be at the center
    const currentVirtualIndex = Math.floor(this.offset / this.itemWidth);
   
    // Calculate how many elements to draw left and right to cover the screen
    // Add +2 buffer for safety
    const halfVisible = Math.ceil((width / this.itemWidth) / 2) + 2;


    // Draw only visible elements
    for (let i = currentVirtualIndex - halfVisible; i <= currentVirtualIndex + halfVisible; i++) {
      // Circular index to retrieve the name from array (handles infinite loop)
      let index = ((i % list.length) + list.length) % list.length;
     
      // Calculate X position
      // (i * itemWidth): absolute theoretical position of element in infinite strip
      // - this.offset: how much we have scrolled
      // + centerX: shift origin to center of screen
      // - (this.itemWidth / 2): center the box relative to its own center point
      let renderX = (i * this.itemWidth) - this.offset + centerX - (this.itemWidth / 2);


      // Draw the box
      this.ctx.fillStyle = this.colors[index % this.colors.length];
     
      // Visual effect: Slightly highlight the one that passes under the center
      const distFromCenter = Math.abs((renderX + this.itemWidth/2) - centerX);
      const isCenter = distFromCenter < (this.itemWidth / 2);
     
      if (isCenter) {
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      } else {
        this.ctx.shadowBlur = 0;
      }


      // Draw rounded rectangle (simulated)
      const padding = 5;
      this.ctx.fillRect(renderX + padding, 10, this.itemWidth - (padding*2), height - 20);
     
      // Draw the border
      this.ctx.strokeStyle = 'white';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(renderX + padding, 10, this.itemWidth - (padding*2), height - 20);


      // Draw the text
      this.ctx.fillStyle = 'white';
      this.ctx.shadowBlur = 4;
      this.ctx.shadowColor = 'black';
     
      // Truncate text if too long
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


    // Request next frame
    this.animationId = requestAnimationFrame(() => this.draw());
  }


  // Function to start spinning
  spin() {
    if (this.wheelConfigurator.isSpinning() || this.wheelConfigurator.names().length < 2) return;
   
    this.wheelConfigurator.winner.set(null);
    this.wheelConfigurator.isSpinning.set(true);
    this.isDecelerating = false;
   
    // Very high initial velocity
    this.velocity = 50 + Math.random() * 20;
   
    // Start braking after random time (e.g. 2 seconds)
    setTimeout(() => {
      this.isDecelerating = true;
    }, 1000 + Math.random() * 1000);
  }


  // Align nearest element to center when wheel stops
  private snapToNearest() {
    // Calculate which index is at the center
    const totalWidth = this.wheelConfigurator.names().length * this.itemWidth;
   
    // Normalized positive offset
    let currentPos = this.offset % totalWidth;
    if (currentPos < 0) currentPos += totalWidth;
   
    // The winning index is the one that "covers" the current offset point
    // (Round to find the "nearest box")
    const winningIndex = Math.round(currentPos / this.itemWidth) % this.wheelConfigurator.names().length;
   
    // Calculate exact offset to center that box
    const targetOffset = winningIndex * this.itemWidth;
   
    // Small visual snap to align perfectly (optional but clean)
    // Here we update this.offset so the next render is centered
    // Note: we maintain the total "rotations" done so far to not jump visually
    const rounds = Math.floor(this.offset / totalWidth);
    this.offset = (rounds * totalWidth) + targetOffset;


    // Determine the winner
    const winnerName = this.wheelConfigurator.names()[winningIndex];
    this.wheelConfigurator.winner.set(winnerName);
  }

  // Listener for window resize
  @HostListener('window:resize')
  onResize() {
    this.initCanvas();
  }
}
