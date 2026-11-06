export class ChildCreatedEvent{
    constructor(
        public readonly childId: number,
        public readonly birthDate: Date,
    ){}
}