export default function catchAsync(fn) {
  return function (req, res, next) {
    fn(req, res, next).catch((err) => {
      console.log(err);
      next(err);
    });
  };
}
