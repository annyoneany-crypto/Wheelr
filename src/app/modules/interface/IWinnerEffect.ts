import { effectType } from '../classes/custom-type';

export interface IWinnerEffect {
    effectType: effectType;
    
    initAnimation(): void;
    resetWinner(): void;
}