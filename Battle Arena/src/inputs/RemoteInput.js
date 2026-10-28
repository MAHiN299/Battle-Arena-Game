// ============================================================
// Stands in for a local device. The host uses this for the
// guest's character, so Player.js needs no changes.
// ============================================================

export default class RemoteInput
{
    constructor(sync)
    {
        this.sync = sync;
    }

    getInputs()
    {
        return this.sync.getRemoteInputs();
    }
}