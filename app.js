const express =  require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate=require("ejs-mate"); 
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const {listingSchema , reviewSchema} = require("./schema.js");
const Review = require("./models/review.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";


main().then(()=>{
    console.log("connected to db");
}).catch((err)=>{
    console.log(err);
})

async function main(){
    await mongoose.connect(MONGO_URL);
}

app.set("view engine" , "ejs");
app.set("views" , path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs' , ejsMate);
app.use(express.static(path.join(__dirname,"/public")));

app.get("/",(req,res)=>{
    res.send("root is working");
})

const validateListing = (req,res,next)=>{
    let {error} = listingSchema.validate(req.body);
    if(error){
        let errMsg  = error.details.map((el)=>el.message).join(",");
        throw new ExpressError(404 , errMsg);
    }else{
        next();
    }

}
const validateReview = (req,res,next)=>{
    let {error} = reviewSchema.validate(req.body);
    if(error){
        let errMsg  = error.details.map((el)=>el.message).join(",");
        throw new ExpressError(404 , errMsg);
    }else{
        next();
    }

}

app.get("/listings" , wrapAsync(async (req,res)=>{
    const allListings = await Listing.find({});
    res.render("listings/index" , {allListings});
}))

app.get("/listings/new" , (req,res)=>{
    res.render("listings/new.ejs");
    
})


app.get("/listings/:id" , wrapAsync(async(req,res)=>{
    let{id} = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    res.render("listings/show.ejs" , {listing});
}))


//create route

app.post("/listings" , validateListing , wrapAsync(async(req,res)=>{
    const newListing = new Listing(req.body.listing);
    await newListing.save();
    res.redirect("/listings");

}))

//edit route
app.get("/listings/:id/edit",wrapAsync(async(req,res)=>{
    let{id} = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs" , {listing});


}))

//update route
app.put("/listings/:id" ,validateListing ,  wrapAsync(async(req,res)=>{
    let{id} = req.params;
    await Listing.findByIdAndUpdate(id , {...req.body.listing});
    res.redirect(`/listings/${id}`);
}))


//delete route
app.delete("/listings/:id" , wrapAsync(async(req,res)=>{
    let {id} = req.params;
    let deleteListing = await Listing.findByIdAndDelete(id);
    console.log(deleteListing);
    res.redirect("/listings");
}))


//Reviews
//Post Route

app.post("/listings/:id/reviews" ,validateReview  , wrapAsync(async(req,res)=>{
     let listing = await Listing.findById(req.params.id);
     let newReview = new Review(req.body.review);

     listing.reviews.push(newReview);

     await newReview.save();
     await listing.save();

     res.redirect(`/listings/${listing._id}`);


}));


//Delete Review Route
app.delete("/listings/:id/reviews/:reviewId", wrapAsync(async(req,res)=>{
    let{id, reviewId} = req.params;

    await Listing.findByIdAndUpdate(id ,{ $pull: {reviews :reviewId}});
    await Review.findByIdAndDelete(reviewId);

    res.redirect(`/listings/${id}`);
}))


// app.get("/testlisting" , async(req,res)=>{
//     let samplelisting = new Listing({
//         title:"My New Villa",
//         description:"By the beach",
//         price:1200,
//         location:"Calangute,Goa",
//         country:"India",
//     })

//     await samplelisting.save();
//     console.log("sample was saved");
//     res.send("succesful testing");
// })

app.use((req,res,next)=>{
    next(new ExpressError(404,"Page Not Found!"));
})
app.use((err,req,res,next)=>{
    let {statusCode=500,message="Something went wrong"} = err;
    res.status(statusCode).render("error.ejs",{message});
    // res.status(statusCode).send(message);
})

app.listen(8080 ,()=>{
    console.log("Listening to port 8080");
})