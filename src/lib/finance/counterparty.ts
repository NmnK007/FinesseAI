/** Group owner-declared labels conservatively; never infer a legal entity or merge fuzzy names. */
export function counterpartyKey(value:string){return value.normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('en-IN');}
