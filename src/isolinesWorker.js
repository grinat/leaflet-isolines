import IsolineCalc from './IsolineCalc'

self.addEventListener('message', ({data}) => {
  const startAt = +new Date()
  try {
    let isolineCalc = new IsolineCalc(data)
    let computedData = isolineCalc.calcIsolines()
    self.postMessage(
      Object.assign(computedData, {startAt})
    )
  } catch (e) {
    const error = e.toString()
    self.postMessage({
      error,
      startAt
    })
  }
})
