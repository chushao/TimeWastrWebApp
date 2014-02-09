class Like < ActiveRecord::Base
  belongs_to :likeable, polymorphic: true
  belongs_to :users
end