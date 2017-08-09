const mongoose = require('mongoose');
const Image = mongoose.model('Image');
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFiler(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: 'That filetype isn\'t allowed!' }, false);
    }
  },
};

exports.homePage = (req, res) => {
  res.render('index', { title: 'Images' });
};

exports.addImage = (req, res) => {
  res.render('editImage', { title: 'Add Image' });
};

// we want a single field called 'photo' and store image into memory
exports.upload = multer(multerOptions).single('photo');

exports.resize = async (req, res, next) => {
  // check if there is no new file to resize
  if (!req.file) {
    return next(); // skip to next middleware
  }

  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`; // unique name of our photo

  // resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);

  // once we have written the photo to our file system.. keep going
  next();
};

exports.createImage = async (req, res) => {
  req.body.author = req.user._id;
  const image = await (new Image(req.body)).save();
  req.flash('success', `Successfully Added ${image.name}.`);
  res.redirect(`/image/${image.slug}`);
};

exports.getImages = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 6;
  // page 1 -> (1 * 8) - 8 = 0 skip=0
  // page 2 -> (2 * 8) - 8 = 8 skip=8
  const skip = (page * limit) - limit;
  // 1. query db for a list of all images
  const imagesPromise = Image
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });

  // count gives us how many there are in total
  const countPromise = Image.count();

  const [images, count] = await Promise.all([imagesPromise, countPromise]);

  // ceil because if we have 17/4 is 4.13769, but we need 5 pages for 17 stores, 4 per page
  const pages = Math.ceil(count / limit);

  if (!images.length && skip) {
    req.flash('info', `Hey! You asked for page ${page}. But that doesn't exist. So I've put you on page ${pages}`);
    res.redirect(`/images/page/${pages}`);
    return;
  }

  res.render('images', {
    title: 'Images',
    images,
    page,
    pages,
    count,
  });
};

const confirmOwner = (image, user) => {
  if (!image.author.equals(user._id)) {
    throw Error('You must be the author in order to edit an image!');
  }
};

exports.editImage = async (req, res) => {
  // 1. find the image given the ID
  const image = await Image.findOne({ _id: req.params.id });
  // 2. confirm they are the owner of the image
  confirmOwner(image, req.user);
  // 3. render out the edit form so the user can update their image
  res.render('editImage', {
    title: `Edit ${image.name}`,
    image,
  });
};

exports.updateImage = async (req, res) => {
  // set location data to be Point (if one updates location, type Point is lost in mongodb)
  req.body.location.type = 'Point';

  // 1. find and update the image
  // 2. redirect to image and tell them it worked
  const image = await Image.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return the new image instead of the old one
    runValidators: true,
  }).exec();
  req.flash('success', `Successfully updated <strong>${image.name}</strong>. <a href="/images/${image.slug}">View Image →</a>`);
  res.redirect(`/images/${image._id}/edit`);
};

exports.getImageBySlug = async (req, res, next) => {
  const image = await Image
    .findOne({ slug: req.params.slug })
    .populate('author reviews');

  if (!image) {
    return next();
  }

  res.render('image', {
    image,
    title: image.name,
  });
};

exports.getImagesByTag = async (req, res) => {
  const tag = req.params.tag;
  // if no 'tag' we simply ask mongo for images that have at least one tag
  const tagQuery = tag || { $exists: true };

  const tagsPromise = Image.getTagsList();
  const imagesPromise = Image.find({ tags: tagQuery });

  const [tags, images] = await Promise.all([tagsPromise, imagesPromise]);

  res.render('tag', {
    tags,
    title: 'Tags',
    tag,
    images,
  });
};

// name and description are index as 'text' so we can use $text to query
exports.searchImages = async (req, res) => {
  const images = await Image
    // first find images that match
    .find({
      $text: {
        $search: req.query.q,
      },
    }, {
      score: { $meta: 'textScore' },
    })
    // then sort them
    .sort({
      score: { $meta: 'textScore' },
    })
    // limit to only 5 results
    .limit(5);
  res.json(images);
};

exports.heartImage = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  // $pull removes from array on User, $addToSet adds uniquely, whereas $push adds multiple times
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
    .findByIdAndUpdate(
      req.user._id,
      { [operator]: { hearts: req.params.id } }, // operator is a variable
      { new: true } // returns new/updated user
    );
  res.json(user);
};

exports.getHearts = async (req, res) => {
  const images = await Image.find({
    _id: { $in: req.user.hearts },
  });
  res.render('images', {
    title: 'Hearted Images',
    images,
  });
};

exports.getTopImages = async (req, res) => {
  const images = await Image.getTopImages();
  // res.json(images);
  res.render('topImages', {
    images,
    title: 'Top Images!',
  });
};
