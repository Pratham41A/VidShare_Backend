import BackblazeB2 from "backblaze-b2";
 
const b2 = new BackblazeB2({
    applicationKeyId: process.env.BACKBLAZEB2APPLICATIONKEYID,
    applicationKey: process.env.BACKBLAZEB2APPLICATIONKEY
    });
    
var authToken='';
var bucketId = '';
var bucketName = '';
var uploadUrl = '';
var uploadAuthToken = '';
var baseDownloadUrl = '';
 async function authorizeB2() {
    try {
        const authResponse = await b2.authorize();
        baseDownloadUrl = authResponse.data.downloadUrl;
        authToken = authResponse.data.authorizationToken;

        const allowed = authResponse.data.allowed;
        bucketId = allowed.bucketId;
        bucketName = allowed.bucketName;
    } catch (err) {
        console.log('authorizeB2 : ',err.message);
    }
}
 async function getUploadInfo() {
    try{
    const uploadResponse = await b2.getUploadUrl({ bucketId });
    uploadUrl = uploadResponse.data.uploadUrl;
    uploadAuthToken = uploadResponse.data.authorizationToken;
    }
    catch(error){
        console.log('getUploadInfo : ',error.message);
    }
}
//fileName :
    //folderName/fileName.extensionName
export async function uploadFile(fileName, data) {
    try{
        await authorizeB2();
        await getUploadInfo();
        const existingFiles = await b2.listFileNames({
            bucketId,
            startFileName: fileName,
            maxFileCount: 1
        });

if (existingFiles.data.files.length > 0) {
            for (const file of existingFiles.data.files) {
                await b2.deleteFileVersion({
                    fileId: file.fileId,
                    fileName: file.fileName
                });
            }
        }

     await b2.uploadFile({  
        uploadUrl,
        uploadAuthToken,
        fileName,
        data
    });
    const downloadAuthorization=await getDownloadAuthorization(fileName);
    const fileDownloadUrl = `${baseDownloadUrl}/file/${bucketName}/${fileName}?Authorization=${downloadAuthorization}`;
    //B2 URL not S3 URL
    return fileDownloadUrl;
}
catch(error){
    console.log('uploadFile : ',error.message);
}
}
 export async function getDownloadAuthorization(fileName) {
    const downloadResponse = await b2.getDownloadAuthorization({
        bucketId,
        fileNamePrefix: fileName,
        validDurationInSeconds: 604800//1 Week
    });
    const downloadAuthorization = downloadResponse.data.authorizationToken;
    return   downloadAuthorization  
}