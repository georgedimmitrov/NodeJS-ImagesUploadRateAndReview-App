const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const imageSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter an image name!',
  },
  slug: String,
  description: {
    type: String,
    trim: true,
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: {
      type: String,
      default: 'Point',
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!',
    }],
    address: {
      type: String,
      required: 'You must supply an address!',
    },
  },
  photo: String,
  // relation - every image has an author
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author!',
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Define our indexes
imageSchema.index({
  name: 'text',
  description: 'text',
});

// for better permalinks we save a slug when we change the name
imageSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    return next(); // stop function
  }

  this.slug = slug(this.name);

  // find other stores that have same slug random, random-1, random-2
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
  // this.constructor accesses the image before it is constructed
  const imagesWithSlug = await this.constructor.find({
    slug: slugRegEx,
  });

  if (imagesWithSlug.length) {
    this.slug = `${this.slug}-${imagesWithSlug.length + 1}`;
  }
  next();
});

imageSchema.statics.getTagsList = function() {
  return this.aggregate([
    // one image with two tags -> returns one image for every tag
    { $unwind: '$tags' },
    // group them by $tags and add new property count
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    // sort descending
    { $sort: { count: -1 } },
  ]);
};

imageSchema.statics.getTopImages = function() {
  return this.aggregate([
    // Lookup Images and populate their reviews
    {
      $lookup: {
        from: 'reviews', // model name is `Review` -> mongodb automatically lowercases and adds 's' at the end -> makes it `reviews`
        localField: '_id', // which field in Image
        foreignField: 'image', // which field in Review
        as: 'reviews' // what to name it
      }
    },
    // filter for only items that have 2 or more reviews
    // NOOB INTERPRETATION: where the second item index[1] in reviews exists
    {
      $match: {
        'reviews.1': { $exists: true }
      }
    },
    // Add the average reviews field
    {
      $project: {
        photo: '$$ROOT.photo',
        name: '$$ROOT.name',
        reviews: '$$ROOT.reviews',
        slug: '$$ROOT.slug',
        averageRating: { $avg: '$reviews.rating' }
      }
    },
    // sort it by our new field, highest reviews first
    { $sort: { averageRating: -1 } },
    // limit to at most 10
    { $limit: 10 },
  ]);
};

// find reviews where the image's _id property === reviews image property
imageSchema.virtual('reviews', {
  ref: 'Review', // what model to link?
  localField: '_id', // which field on the image?
  foreignField: 'image', // which field on the review?
});

function autopopulate(next) {
  this.populate('reviews');
  next();
}

imageSchema.pre('find', autopopulate);
imageSchema.pre('findOne', autopopulate);

module.exports = mongoose.model('Image', imageSchema);
