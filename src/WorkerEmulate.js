import IsolineCalc from './IsolineCalc'

export default class WorkerEmulate {
  constructor () {
    this._cb = null
  }

  postMessage (data) {
    const startAt = +new Date()
    try {
      const isolineCalc = new IsolineCalc(data)
      let computedData = isolineCalc
        .calcIsolines()
        .recaclOnEmpty()
        .getComputedPoly()
      this._cb({
        data: {
          ...computedData,
          startAt
        }
      })
    } catch (e) {
      const error = e.toString()
      this._cb({
        data: {error, startAt}
      })
      console.error(e)
    }
  }

  onComplete (cb) {
    this._cb = cb
  }
}
