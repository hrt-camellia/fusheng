export interface BraceletBead { instanceId:string; crystalId:string; sizeMm:number; }
export interface BraceletDesign { id:string; name:string; theme:string; wristSizeMm:number; style:string; beads:BraceletBead[]; createdAt:string; updatedAt:string; }
