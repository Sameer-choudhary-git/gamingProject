import { PendingMessage } from "./UCI"; 
export class StockfishState{
    worker:Worker|null=null;
    isReady:boolean=false;
    pendingMessages:PendingMessage[]=[];
}