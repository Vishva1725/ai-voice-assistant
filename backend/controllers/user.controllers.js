 import uploadOnCloudinary from "../config/cloudinary.js"
import geminiResponse from "../gemini.js"
import { serpSearch } from "../utils/serpapi.js"
import User from "../models/user.model.js"
import moment from "moment"
 export const getCurrentUser=async (req,res)=>{
    try {
        const userId=req.userId
        const user=await User.findById(userId).select("-password")
        if(!user){
return res.status(400).json({message:"user not found"})
        }

   return res.status(200).json(user)     
    } catch (error) {
       return res.status(400).json({message:"get current user error"}) 
    }
}

export const updateAssistant=async (req,res)=>{
   try {
      const {assistantName,imageUrl}=req.body
      let assistantImage;
if(req.file){
   assistantImage=await uploadOnCloudinary(req.file.path)
}else{
   assistantImage=imageUrl
}

const user=await User.findByIdAndUpdate(req.userId,{
   assistantName,assistantImage
},{new:true}).select("-password")
return res.status(200).json(user)

      
   } catch (error) {
       return res.status(400).json({message:"updateAssistantError user error"}) 
   }
}


export const askToAssistant=async (req,res)=>{
   try {
      const {command}=req.body
      const user=await User.findById(req.userId);
      user.history.push(command)
      user.save()
      const userName=user.name
      const assistantName=user.assistantName
      const result=await geminiResponse(command,assistantName,userName)

         const jsonMatch = result && result.match ? result.match(/{[\s\S]*}/) : null
         if (!jsonMatch) {
             // If the model didn't return a JSON object as instructed, fall back to returning
             // the raw model text as a general response so the frontend can speak it.
             console.warn('Gemini did not return JSON, returning raw response as fallback:', result)
             return res.json({
                  type: 'general',
                  userInput: command,
                  response: result || "Sorry, I couldn't get a response from the assistant."
             })
         }

         let gemResult
         try {
            gemResult = JSON.parse(jsonMatch[0])
         } catch (parseErr) {
            console.error('Failed to parse JSON from Gemini result:', parseErr, jsonMatch[0])
            return res.json({
               type: 'general',
               userInput: command,
               response: result || "Sorry, I couldn't understand the assistant response."
            })
         }
      console.log(gemResult)
      const type=gemResult.type

      switch(type){
         case 'get-date' :
            return res.json({
               type,
               userInput:gemResult.userInput,
               response:`current date is ${moment().format("YYYY-MM-DD")}`
            });
            case 'get-time':
                return res.json({
               type,
               userInput:gemResult.userInput,
               response:`current time is ${moment().format("hh:mm A")}`
            });
             case 'get-day':
                return res.json({
               type,
               userInput:gemResult.userInput,
               response:`today is ${moment().format("dddd")}`
            });
            case 'get-month':
                return res.json({
               type,
               userInput:gemResult.userInput,
               response:`today is ${moment().format("MMMM")}`
            });
         case 'google-search':
            // perform web search via SerpAPI if available
            try{
               const {snippet} = await serpSearch(gemResult.userInput)
               const reply = snippet || gemResult.response || 'Sorry, I could not find results.'
               return res.json({ type, userInput: gemResult.userInput, response: reply })
            }catch(e){
               return res.json({ type, userInput: gemResult.userInput, response: gemResult.response })
            }
         case 'youtube-search':
         case 'youtube-play':
         case 'general':
         case  "calculator-open":
         case "instagram-open": 
          case "facebook-open": 
          case "weather-show" :
             return res.json({
                  type,
                  userInput:gemResult.userInput,
                  response:gemResult.response,
             });

         default:
            return res.status(400).json({ response: "I didn't understand that command." })
      }
     

   } catch (error) {
  return res.status(500).json({ response: "ask assistant error" })
   }
}