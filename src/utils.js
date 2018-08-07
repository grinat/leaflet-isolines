export function getDefaultColor (propValue) {
  let val = +(propValue.toString().split('-')[0]) * 20
  if (val > 255) {
    val = 255
  } else if (val < 0) {
    val = 0
  }
  return `rgb(${val}, ${val}, ${val})`
}
