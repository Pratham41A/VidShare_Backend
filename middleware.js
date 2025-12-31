import jwt from 'jsonwebtoken'

export function auth(req, res, next) {
  const signedToken = req?.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');

  if (!signedToken) {
   return res.status(401).json({error:'No Signed Token'})
  }
try{
    const token = jwt.verify(signedToken, process.env.JWT_SECRET);
    req.user= {id:token.id} 
    next();
}
catch(error){
  console.log('auth : ',error.message);
return    res.status(401).json({error:'Invalid Token'})
}
}
