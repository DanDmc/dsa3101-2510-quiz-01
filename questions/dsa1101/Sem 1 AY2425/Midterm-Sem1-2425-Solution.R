
######### SOLUTIONS OF MIDTERM TEST FOR STUDENTS

# Q1 WHICH HAS 15 SMALL QUESTIONS INSIDE: TOTAL = 50 points

setwd("~/Documents/Data")

set.seed(310) # -2 points if not having this command


data = read.csv("patient_satisfaction.csv")

################. PART 1: DATA EXPLORATION

names(data)
# [1] "Satisfaction"     "Age"              "Severity"         "Surgical.Medical" "Anxiety"    

# Surgical.Medical: 1 = If patient got surgical; 0 otherwise

dim(data) # 25 rows; 5 columns

head(data)

# Q1 (2 points): Write code to change the name of the 4th column of data to Surgical. 

names(data)[4] = "Surgical" 

names(data)




# Q2 (2 points) Write code to create a table of proportions for column Surgical. 
# Report the percentage of patients that had surgery.

# table(data$Surgical) # RAW FREQUENCY: 14 patient got Surgical
prop.table(table(data$Surgical))*100 # PERCENTAGE TABLE 
# 56% of patients had surgery 

attach(data)





# Q3 (2 points) Write code to create a histogram with normal density curve overlay-ed for the sample of satisfaction.

hist(Satisfaction, freq = FALSE) 
n = length(Satisfaction)

hist(Satisfaction, freq=FALSE, main = paste("Histogram of Total Sales"),
     xlab = "total sales", ylab="Probability", 
     col = "grey")#, ylim = c(0, 0.002))
x <- seq(0, max(Satisfaction), length.out=n)
y <- dnorm(x, mean(Satisfaction), sd(Satisfaction))
lines(x, y, col = "red") # this is the normal density curve 




# Q4 (2 points) Write code to create a QQ plot for the sample of satisfaction. 
# Give your comments.

qqnorm(Satisfaction, pch = 20)
qqline(Satisfaction, col = "red") 

# COMMENTS: BOTH LEFT TAIL AND RIGHT TAIL ARE NOT CLEARLY CONTRADICT FROM NORMAL 
# SOME MIGHT SAY: RIGHT TAIL POSSIBLY/LIGHTLY SHORTER THAN NORMAL




# Q5 (4 points) Write code to create box plots of the satisfaction scores by groups of surgical status. 
# Give your comments.

boxplot(Satisfaction ~ Surgical) 
# the median point of satisfaction for patients got surgical is lower.
# 2 boxes are overlapping. 
# Hence, NO clear difference in the satisfaction points of patients with or without surgical. 
# no outlier for both groups 





# Q6 (6 points) Write code to create a scatter plot of satisfaction score against 
# the age of patients for which the points are classified by the surgical status: 
# points of patients had surgical is in red color and points of patients with no surgical is in blue color. 
# Give your comments. 


plot(Satisfaction ~ Age, type = "n")
points(Satisfaction[which(Surgical == 1)] ~ Age[which(Surgical==1)], col = "red", pch = 20)
points(Satisfaction[which(Surgical == 0)] ~ Age[which(Surgical==0)], col = "blue", pch = 20)
legend(25, 50, legend = c("Surgical", "No surgical"), col = c("red","blue"), pch=c(20,20))


cor(Satisfaction, Age) # -0.87
# strong negative association, quite linear  
# the variablity of satisfaction is quite stable when age changes 




##########  Part II: Linear Model (TOTAL = 8 points)
########## MODEL: Satisfaction ~ Age + Severity + Surgical + Anxiety


# Q7 (4 points) Fit a linear regression model for the response variable named as M, using all input features.
# Report p-values of the regressors that are NOT significant in the model, at significance level 0.1.

data$Surgical = as.factor(data$Surgical) # 

M = lm(Satisfaction ~ Age + Severity + Surgical + Anxiety, data = data) 

summary(M)

# variable that is the most non-significant is Surgical with p-value 0.5968 




# Q8 (4 points) Two patients, A and B, that have information listed below. 
# Write code to predict the satisfaction score for both of them. 
# Report the prediction values. 

new = data.frame(Age = c(35, 60), Severity = c(45, 40), Surgical = c("0", "1"), Anxiety = c(2.5, 3))  

predict(M, newdata = new) 

# REPORT THE OUTCOMES
# A: 82.19378 
# B: 58.83136



#################### Part III: KNN (total = 24 points)

####################### KNN NOT USING SURGICAL VARIABLE; SATISFACTION BE CATEGORIZED AS 2 GROUPS



# Q9 (2 points) Write R code to create a new column in data, 
# names as S where S has two categories: Good and Not Good.
# S = Good if the satisfaction score is larger than 70; and S is Not Good if the satisfaction score <=70.

data$S = ifelse(data$Satisfaction >70, "Good", "Not Good")

head(data) # 6 columns




# Q10 (2 points) Write code to create a new data frame, called data.X 
# which has the three columns Age, Severity and Anxiety after standardization for all patients.

data.X = scale(data[, c(2,3,5)]) # scale Age, Severity and Anxiety




# Q11 (4 points) Write code to randomly split the total patients into two groups: 
# one group has 15 patients (will be the train set) 
# and other group has the rest of patients (will be the test set).

n1 = 15 # number of points in train set

n2 = 10 # number of points in test set

label = c(rep(1, n1), rep(2, n2))  # this has length of 25  
# create n1 number 1 and n2 number 2, to use them as labels
# label 1 is for train set; label 2 is for test set.
# we'll assign the labels to each row randomly

label = sample(label) 
# we mix well the labels with each other in a random order

test.row <- which(label == 2) 
# get the index of the points that will be in the test set
test.X = data.X[test.row, ]
test.Y = data[test.row, 6]

train.X = data.X[-test.row, ]
train.Y = data[-test.row, 6]



cbind(test.X, test.Y) # for reference 
cbind(train.X, train.Y) # for reference 

### NOTE: STUDENT MIGHT HAVE DIFFERENT WAYS TO RANDOMLY SPLIT 25 POINTS INTO TRAIN AND TEST. 
# PLEASE CHECK CAREFULLY AND AWARD THE POINTS IF THEY DO IT CORRECTLY.




# Q12 (6 points) Use the train set with three standardized features to form the KNN classifiers where K = 3, 5, 7, 9, 11$, 
# and accuracy value for each classifier is kept in a vector named "accuracy"

library(class)

K = c(3, 5, 7, 9, 11) 
# length(K) = 5

accuracy= numeric()
 
for (i in K){ 

	pred <- knn(train=train.X, test=test.X, cl=train.Y, k=i) 
	# KNN with k receiving value as in vector K

      confusion.matrix = table(test.Y, pred)  
      
      accuracy =append(accuracy, sum(diag(confusion.matrix))/sum(confusion.matrix) )
      }




# Q13 (2 points) Write code to plot "accuracy" against K in the question above.

accuracy
# [1] 0.8 0.9 0.8 1.0 0.8

plot(K, accuracy, xlab = "k", ylab = "Accuracy", pch = 20, col = "red", type = "l")




# Q14 (2 points) Using accuracy as the criterion, report the best k found and the accuracy of the KNN classifier with that value of k

cbind(K, accuracy) 
# this helps to check which value of k gives highest accuracy

# Report: k = 9 is the best



# Q15 (6 points) Use the KNN with the best k found in Question 14 to predict 
# the rank (Good, Not Good) that patient A will evaluates the hospital service.

# GET THE MEAN AND SD OF EACH COLUMN IN data[, c(2,3,5)] SO THAT WE CAN STANDARDIZE NEW POINTS - patient A

new  # this is for two patients A and B THAT WAS FORMED IN LINEAR MODEL

mean = colMeans(data[, c(2,3,5)]) 
# mean from orignal data, before standardization
# Age Severity  Anxiety 
# 50.840   45.920    3.932 

sd = apply(X = data[, c(2,3,5)], FUN = sd, MARGIN  = 2) 
# Age  Severity   Anxiety 
# 14.809006 13.028558  1.764162 

# Standardize patient A: 1st row, columns 1, 2, 4 only (not taking column 3 = Surgical)

scale.A = (new[1,c(1,2,4)] - mean)/sd 



# ANOTHER WAY IS TO FIND THE MEAN AND SD FOR EACH COLUMN SEPARATELY

# THEN you can scale one value at a time for patient A (row 1 of "new")
Age.A = ( new[1, 1] - mean(data$Age)  ) /(sd(data$Age))
Severity.A = ( new[1, 2] - mean(data$Severity)  ) /(sd(data$Severity)) 
Anxiety.A = ( new[1, 4] - mean(data$Anxiety)  ) /(sd(data$Anxiety)) 

new.scale.A = data.frame(Age = Age.A, Severity = Severity.A, Anxiety = Anxiety.A)
# new.scale.A IS EXACTLY THE SAME AS scale.A


# APPLY KNN with k = 9, TO PREDICT THE RESPONSE FOR patient A:
knn(train=train.X, test=scale.A, cl=train.Y, k=9) 

# REPORT: PATIENT A is predicted as will rank Good for for hospital service. 





########### QUESTION 2 = TOTAL WORTH 10 POINTS


# Alena Lee currently is working for a company. 
# Her current salary is 50k yearly and is increased 5% every year.

# So far, until end of 2024, she has a saving amount of 30k.

# However, she wants to form a start-up company which will requires an initial amount of 100k. 


# Write R codes that help to calculate the smallest proportion (up to 2 decimal places) 
# of yearly salary that she should save so that she could have enough money for 
# her start-up in 5 years, counting from starting 2025 onward.

####### SIMLAR AS TUTORIAL 1, WE DEFINE A FUNCTION THAT HELPS TO CALCULATE THE NUMBER OF YEARS
####### THAT HELPS TO SAVE ENOUGH MONEY 
####### HOWEVER, THIS FUNCTION SHOULD HAVE 2 VARIABLES: SALARY AND PROPORTION SAVE

# Part 1 



rate = 0.05 # rate of salary increasing yearly

saved = 30000 
year = 0
function.year = function(salary, portion_save = 0.2){
	while(saved <100000 ) {
		salary = salary*(1 + rate) # MUST INCREASE AT THE START 
		year = year + 1
		saved = saved + portion_save *salary

		#print(c(saved, salary) )
	}
	return(year)
}

function.year(salary = 50000) 
# this means if Alena Lee saves 20% of her annual salary, then she needs 6 years to get saved >=100k



# PART 2 
################# TO GET WHAT PROPOTION TO SAVE MONEY, THERE ARE 2 METHODS:

################# FIRST METHOD: USE WHILE LOOP AND THE FUNCTION DEFINED ABOVE

F = function(salary){
	
portion= seq(0.01, 1, by = 0.01) 
year = 6
i= 1
while( (year >5) & (i <=100) ){
	saved = 30000
	year = 0
	portion_save = portion[i] # we need this for the return/output of the function
	year = function.year(salary, portion_save = portion[i])
	if (year >5) {i = i+ 1}
}
return(portion_save)

}

F(salary = 50000) # 0.25

# That means, to have enough 100k in 5 years, 
# she needs to save at least 25% of the salary


############# SECOND METHOD: USE FOR LOOP FOR ALL THE POSSIBLE PROPORTIONS: 0.01 TO 1.00
# AND USE FUNCTION DEFINED ABOVE TO CALCULATE NUMBER OF YEARS

# idea: we'll try for each value of proportion, starting from 0.01 -> 0.02 -> 0.03..., till 0.99 and 1
# to see how many years it takes to get the saved value be >=100k.
# the smallest proportion that helps to save enough money in 5 years is chosen.
# the variable i of the for loop will run through the indexes of vector "portion", from 1 to 100

number.year = numeric() 

portion= seq(0.01, 1, by = 0.01) 

for (i in 1:100) {
	portion_save = portion[i]
	saved = 30000
	year = 0
	year = function.year(salary = 50000, portion_save = portion[i])
	number.year = append(number.year, year)
	i = i + 1	
}

cbind(portion, number.year)
# this matrix list the number of years to get saved value >=100k (2nd col), for 
# each value of proportion (in 1st col)
# it shows that when proportion = 0.25 or larger, the number of years to get 
# saved value be >=100 is 5 years or less than 5 years.


