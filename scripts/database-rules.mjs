const rule = (expression) => ({ '.validate': expression });
const isLeafRule = (value) => Object.keys(value).length === 1 && typeof value['.validate'] === 'string';
const strictRecord = (required, fields, extra = '') => {
  const leafFields = Object.entries(fields).filter(([, value]) => isLeafRule(value));
  const nestedFields = Object.fromEntries(Object.entries(fields).filter(([, value]) => !isLeafRule(value)));
  const leafValidation = leafFields
    .map(([name, value]) => `($field === '${name}' && (${value['.validate']}))`)
    .join(' || ');

  return {
    '.validate': `newData.hasChildren([${required.map((name) => `'${name}'`).join(',')}])${extra ? ` && ${extra}` : ''}`,
    ...nestedFields,
    '$field':rule(leafValidation || false),
  };
};
const collection = (variable, entry) => ({ '.validate':'newData.hasChildren()', [variable]:entry });

const text = (maximum) => rule(`newData.isString() && newData.val().length <= ${maximum}`);
const requiredText = (maximum) => rule(`newData.isString() && newData.val().length > 0 && newData.val().length <= ${maximum} && newData.val().matches(/.*[^ ].*/)`);
const requiredTextMaxFirst = (maximum) => rule(`newData.isString() && newData.val().length <= ${maximum} && newData.val().length > 0 && newData.val().matches(/.*[^ ].*/)`);
const currency = () => rule("newData.isString() && newData.val().matches(/^[A-Z]{3}$/)");
const integer = (minimum, maximum) => rule(`newData.isNumber() && newData.val() >= ${minimum} && newData.val() <= ${maximum} && newData.val() % 1 === 0`);
const money = () => integer(0, 100000000000);
const time = () => rule("newData.isString() && newData.val().matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/)");
const date = () => rule("newData.isString() && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)");
const boundedDate = () => rule("newData.isString() && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/) && newData.val() >= newData.parent().parent().parent().child('startDate').val() && newData.val() <= newData.parent().parent().parent().child('endDate').val()");
const mapsUrl = () => rule(String.raw`newData.isString() && newData.val().length <= 600 && (newData.val() === '' || newData.val().matches(/^https:\/\/(www\.google\.com\/maps|google\.com\/maps|maps\.google\.com\/|maps\.app\.goo\.gl\/|goo\.gl\/maps\/).*/))`);
const identifier = (key) => rule(`newData.isString() && newData.val() === ${key} && newData.val().length > 0 && newData.val().length <= 100`);
const groupReference = () => rule("newData.isString() && newData.val().length <= 100 && (newData.val() === '' || newData.parent().parent().parent().child('groups').child(newData.val()).exists())");

const parkingSpot = () => strictRecord(['name','mapsUrl'], {
  name:text(120), mapsUrl:mapsUrl(), walkMinutes:integer(0,1440), feeMinor:money(), currency:currency(), note:text(300),
}, "(newData.child('name').val() !== '' || (newData.child('mapsUrl').val() === '' && !newData.child('walkMinutes').exists() && !newData.child('feeMinor').exists() && !newData.child('note').exists())) && (!newData.child('feeMinor').exists() || newData.child('currency').exists())");

const parkingSet = (groupCheck = '') => strictRecord(['primary','backup','notes'], {
  primary:parkingSpot(), backup:parkingSpot(), notes:text(300),
}, groupCheck);

const parking = () => strictRecord(['primary','backup','notes'], {
  primary:parkingSpot(),
  backup:parkingSpot(),
  notes:text(300),
  mode:rule("newData.val() === 'shared' || (newData.val() === 'split' && newData.parent().parent().parent().parent().child('groups').hasChildren())"),
  byGroup:{
    '$groupId':parkingSet("newData.parent().parent().parent().parent().parent().child('groups').child($groupId).exists()"),
  },
});

const group = () => strictRecord(['id','name'], {
  id:identifier('$groupKey'),
  name:requiredText(50),
});

const flight = () => strictRecord(['origin','destination','departureTimeZone','arrivalTimeZone','arrivalDateTime'], {
  origin:text(12),
  destination:text(12),
  departureTimeZone:text(64),
  arrivalTimeZone:text(64),
  arrivalDateTime:rule("newData.isString() && (newData.val() === '' || newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$/))"),
});

const item = () => strictRecord(['id','date','type','title','currency'], {
  id:identifier('$itemKey'),
  date:boundedDate(),
  type:rule("newData.val() === 'place' || newData.val() === 'meal' || newData.val() === 'stay' || newData.val() === 'flight' || newData.val() === 'transport' || newData.val() === 'other'"),
  title:requiredText(100),
  startTime:rule("newData.isString() && (newData.val() === '' || newData.val().matches(/^([01][0-9]|2[0-3]):[0-5][0-9]$/))"),
  endDate:rule("newData.isString() && newData.val().matches(/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/) && newData.val() >= newData.parent().child('date').val() && newData.val() <= newData.parent().parent().parent().child('endDate').val()"),
  endTime:time(),
  transitMode:rule("newData.val() === 'driving' || newData.val() === 'walking' || newData.val() === 'transit' || newData.val() === 'other'"),
  transitMinutes:integer(0,1440),
  location:text(200),
  mapsUrl:mapsUrl(),
  notes:text(1000),
  parking:parking(),
  groupId:groupReference(),
  amountMinor:money(),
  currency:currency(),
  flight:flight(),
}, "((!newData.child('endTime').exists() && !newData.child('endDate').exists()) || (newData.hasChildren(['startTime','endTime','endDate']) && newData.child('type').val() !== 'flight' && newData.child('startTime').val() !== '' && (newData.child('endDate').val() > newData.child('date').val() || newData.child('endTime').val() >= newData.child('startTime').val()))) && (!newData.child('transitMinutes').exists() || newData.child('transitMode').exists())");

const place = () => strictRecord(['id','title','category','favorite'], {
  id:identifier('$placeKey'), title:requiredTextMaxFirst(100), region:text(100), category:requiredTextMaxFirst(50), subcategory:text(50),
  hours:text(200), location:text(200), mapsUrl:mapsUrl(), notes:text(1000), favorite:rule('newData.isBoolean()'),
});

const rental = () => strictRecord(['id','company','pickupDate','pickupTime','pickupLocation','returnDate','returnTime','returnLocation','currency'], {
  id:identifier('$rentalKey'), company:requiredTextMaxFirst(100), car:text(100), branch:text(200), booking:text(100), notes:text(1000),
  pickupLocation:requiredTextMaxFirst(200), returnLocation:requiredTextMaxFirst(200), groupId:groupReference(), currency:currency(), amountMinor:money(),
  pickupMapsUrl:mapsUrl(), pickupTime:time(), pickupDate:boundedDate(), returnMapsUrl:mapsUrl(), returnTime:time(), returnDate:boundedDate(),
}, "(newData.child('returnDate').val() > newData.child('pickupDate').val() || (newData.child('returnDate').val() === newData.child('pickupDate').val() && newData.child('returnTime').val() >= newData.child('pickupTime').val()))");

const stay = () => strictRecord(['id','title','location','checkInDate','checkInTime','checkOutDate','checkOutTime','guests','currency'], {
  id:identifier('$stayKey'), title:requiredTextMaxFirst(100), location:requiredTextMaxFirst(200), checkInDate:boundedDate(), checkInTime:time(),
  checkOutDate:boundedDate(), checkOutTime:time(), mapsUrl:mapsUrl(), groupId:groupReference(), booking:text(100), notes:text(1000),
  room:text(100), currency:currency(), amountMinor:money(), guests:integer(1,1000),
}, "(newData.child('checkOutDate').val() > newData.child('checkInDate').val() || (newData.child('checkOutDate').val() === newData.child('checkInDate').val() && newData.child('checkOutTime').val() >= newData.child('checkInTime').val()))");

const expense = () => strictRecord(['id','title','date','amountMinor','currency','splitCount'], {
  id:identifier('$expenseKey'), title:requiredText(100), date:boundedDate(), groupId:groupReference(), amountMinor:money(), currency:currency(),
  notes:text(1000), category:text(50), payer:text(100), splitCount:integer(1,1000),
});

const tripVersion = () => strictRecord(['schemaVersion','id','title','destination','startDate','endDate','timeZone','currency','createdAt','updatedAt','revision'], {
  schemaVersion:rule('newData.isNumber() && newData.val() === 1'),
  id:rule("newData.isString() && newData.val() === $tripId"),
  title:requiredText(80),
  destination:requiredText(120),
  startDate:rule("newData.isString() && newData.val().matches(/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/)"),
  endDate:rule("newData.isString() && newData.val().matches(/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/)"),
  timeZone:rule(String.raw`newData.isString() && newData.val().length > 0 && newData.val().length <= 64 && newData.val().matches(/^[A-Za-z0-9_+.-]+(\/[A-Za-z0-9_+.-]+)*$/)`),
  currency:currency(),
  createdAt:rule("newData.isString() && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{3})?Z$/)"),
  updatedAt:rule("newData.isString() && newData.val().matches(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]{3})?Z$/)"),
  revision:rule('newData.isNumber() && newData.val() >= 1 && newData.val() % 1 === 0'),
  groups:collection('$groupKey',group()),
  items:collection('$itemKey',item()),
  places:collection('$placeKey',place()),
  rentals:collection('$rentalKey',rental()),
  stays:collection('$stayKey',stay()),
  expenses:collection('$expenseKey',expense()),
}, "newData.child('id').val() === $tripId && newData.child('startDate').val() <= newData.child('endDate').val() && newData.child('createdAt').val() <= newData.child('updatedAt').val() && newData.child('revision').val() + '' === $revision && newData.parent().parent().child('head').val() === newData.child('revision').val() && (!root.child('trips').child($tripId).exists() || newData.child('createdAt').val() === (root.child('trips').child($tripId).child('head').exists() ? root.child('trips').child($tripId).child('versions').child(root.child('trips').child($tripId).child('head').val() + '').child('createdAt').val() : root.child('trips').child($tripId).child('data').child('createdAt').val()))");

export const databaseRules = {
  rules:{
    '.read':false,
    '.write':false,
    diagnostics:{
      '$uid':{
        '.read':'auth != null && auth.uid === $uid',
        '.write':'auth != null && auth.uid === $uid',
        '$entry':strictRecord(['createdAt','storageFormat'], {
          createdAt:rule('newData.isNumber()'),
          storageFormat:rule('newData.val() === 2'),
        }),
      },
    },
    userTrips:{
      '$uid':{
        '.read':'auth != null && auth.uid === $uid',
        '$tripId':{
          '.write':"auth != null && (auth.uid === $uid || root.child('trips').child($tripId).child('members').child(auth.uid).val() === 'owner' || newData.parent().parent().parent().child('trips').child($tripId).child('members').child(auth.uid).val() === 'owner') && (!newData.exists() || newData.val() === true)",
          '.validate':"newData.val() === true && newData.parent().parent().parent().child('trips').child($tripId).child('members').child($uid).exists()",
        },
      },
    },
    trips:{
      '$tripId':{
        '.read':"auth != null && data.child('members').child(auth.uid).exists()",
        '.write':"auth != null && ((!data.exists() && newData.child('ownerId').val() === auth.uid && newData.child('head').val() === 1) || (data.child('ownerId').val() === auth.uid && !newData.exists()))",
        '.validate':"newData.hasChildren(['ownerId','members']) && newData.child('ownerId').isString() && (!data.exists() || newData.child('ownerId').val() === data.child('ownerId').val()) && newData.child('members').child(newData.child('ownerId').val()).val() === 'owner' && ((newData.child('head').exists() && !newData.child('data').exists() && newData.child('versions').child(newData.child('head').val() + '').child('revision').val() === newData.child('head').val() && (!data.child('head').exists() || newData.child('head').val() === data.child('head').val() || !newData.child('versions').child(data.child('head').val() + '').exists())) || (!newData.child('head').exists() && data.child('data').exists() && newData.child('data').exists() && !newData.child('versions').exists()))",
        ownerId:rule('newData.isString()'),
        members:{
          '$uid':rule("($uid === newData.parent().parent().child('ownerId').val() && newData.val() === 'owner') || ($uid !== newData.parent().parent().child('ownerId').val() && (newData.val() === 'editor' || newData.val() === 'viewer'))"),
          '.write':"auth != null && root.child('trips').child($tripId).child('ownerId').val() === auth.uid",
        },
        data:{
          '.write':"(auth != null && root.child('trips').child($tripId).child('ownerId').val() === auth.uid) && !newData.exists() && newData.parent().child('head').val() === data.child('revision').val() + 1",
        },
        head:{
          '.write':"(auth != null && (root.child('trips').child($tripId).child('members').child(auth.uid).val() === 'owner' || root.child('trips').child($tripId).child('members').child(auth.uid).val() === 'editor')) && (root.child('trips').child($tripId).child('head').exists() || (auth != null && root.child('trips').child($tripId).child('ownerId').val() === auth.uid))",
          '.validate':"newData.isNumber() && newData.val() % 1 === 0 && ((!root.child('trips').child($tripId).exists() && newData.val() === 1) || newData.val() === (root.child('trips').child($tripId).child('head').exists() ? root.child('trips').child($tripId).child('head').val() : root.child('trips').child($tripId).child('data').child('revision').val()) + 1)",
        },
        versions:{
          '$revision':{
            '.write':"((auth != null && (root.child('trips').child($tripId).child('members').child(auth.uid).val() === 'owner' || root.child('trips').child($tripId).child('members').child(auth.uid).val() === 'editor')) && (root.child('trips').child($tripId).child('head').exists() || (auth != null && root.child('trips').child($tripId).child('ownerId').val() === auth.uid))) && ((!data.exists() && newData.exists() && newData.child('revision').val() === (root.child('trips').child($tripId).child('head').exists() ? root.child('trips').child($tripId).child('head').val() : root.child('trips').child($tripId).child('data').child('revision').val()) + 1 && newData.parent().parent().child('head').val() === newData.child('revision').val()) || (data.exists() && !newData.exists() && newData.parent().parent().child('head').val() + '' !== $revision))",
            ...tripVersion(),
          },
        },
        '$other':rule(false),
      },
    },
  },
};
