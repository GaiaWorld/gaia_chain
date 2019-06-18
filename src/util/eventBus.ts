/**
 * event bus
 */

export interface Listener {
    // listener identifier
    id: string;
    // event name
    evtName: string[];
    // target to receive event
    target: GaiaEvent[];
}

export interface GaiaEvent {
    evtName: string;
    data: {};
}

export class GaiaEventBus {
    private listener: Map<string, Listener>;

    public constructor() {
        this.listener = new Map();
    }

    public postEvent(evt: GaiaEvent): void {
        this.listener.forEach((value: Listener, _: string) => {
            if (value.evtName.indexOf(evt.evtName) > 0) {
                value.target.push(evt);
            }
        });
    }

    public addListener(listener: Listener): void {
        this.listener.set(listener.id, listener);
    }

    public removeListener(id: string): void {
        this.listener.remove(id);
    }

    public broadCast(evt: GaiaEvent): void {
        for (const lis of this.listener) {
            lis.target.push(evt);
        }
    }
}
