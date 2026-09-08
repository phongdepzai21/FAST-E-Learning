const fs = require('fs');
let code = fs.readFileSync('pages/Courses.tsx', 'utf8');

const listTarget = `{filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">`;
const listNew = `{isLoadingOwnership ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full">
                        <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
                        <div className="p-6 flex-1 flex flex-col space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="h-4 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                            </div>
                            <div className="h-6 w-full bg-gray-200 rounded-md animate-pulse"></div>
                            <div className="h-6 w-3/4 bg-gray-200 rounded-md animate-pulse"></div>
                            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-10 w-28 bg-gray-200 rounded-xl animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">`;
code = code.replace(listTarget, listNew);

fs.writeFileSync('pages/Courses.tsx', code);
