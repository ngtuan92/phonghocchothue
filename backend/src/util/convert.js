
module.exports = {
    mutipleConvertToObject : function(Arrays) {
        return Arrays.map((r) => r.dataValues)
    },
    convertToObject : function (Array) {
        return Array.dataValues;
    },
    formatDate : function (date) {
        const inputDate = new Date(date);

        const day = inputDate.getDate().toString().padStart(2, '0');
        const month = (inputDate.getMonth() + 1).toString().padStart(2, '0');
        const year = inputDate.getFullYear();
        
        const formattedDateString = `${day}/${month}/${year}`;
        return formattedDateString
    }
}
