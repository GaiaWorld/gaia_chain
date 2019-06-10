/**
 * common stack
 */

const CAPACITY:number = 10;

export class Stack<T> {
        
    private elements:T[];
    private _size:number;
        
    public constructor(capacity:number = CAPACITY) {
        this.elements = new Array<T>(capacity);
        this._size = 0;
    }

    public push(o:T) {
        const len = this.elements.length;
        if (this._size >= len) {
            const temp = new Array<T>(len);
            this.elements = this.elements.concat(temp);
        }
        this.elements[this._size++] = o;
    }

    public pop():T {
        return this.elements[--this._size];
    }

    public peek():T {
        return this.elements[this._size - 1];
    }

    public size():number {
        return this._size;
    }
        
    public empty():boolean {
        return this._size === 0;
    }

    public clear(capacity:number = CAPACITY) {
        delete this.elements;
        this.elements = new Array(capacity);
        this._size = 0;
    }
}